import { getDatabase, runTransaction, logSystemEvent } from '../config/database';
import { ApiResponse, Battle, BattleAction } from '../types';

export interface Replay {
  id: number;
  battle_id: number;
  title?: string;
  description?: string;
  replay_data: string; // JSON 형태로 저장된 리플레이 데이터
  duration: number; // 배틀 지속 시간 (초)
  winner_id?: number;
  player1_id: number;
  player2_id: number;
  total_turns: number;
  created_at: Date;
  view_count: number;
  is_featured: boolean;
  // JOIN된 데이터
  player1_name?: string;
  player2_name?: string;
  winner_name?: string;
}

export interface ReplayData {
  battle: Battle;
  actions: BattleAction[];
  metadata: {
    startTime: Date;
    endTime: Date;
    duration: number;
    totalTurns: number;
    winner?: string;
  };
}

export class ReplayModel {
  /**
   * 배틀 종료 시 리플레이 생성
   */
  static async createFromBattle(battleId: number): Promise<ApiResponse<Replay>> {
    try {
      return await runTransaction(async (db) => {
        // 배틀 정보와 액션 기록 조회
        const battle = await db.get(`
          SELECT b.*, 
                 p1.name as player1_name, p2.name as player2_name,
                 w.name as winner_name
          FROM battles b
          LEFT JOIN characters p1 ON b.player1_id = p1.id
          LEFT JOIN characters p2 ON b.player2_id = p2.id
          LEFT JOIN characters w ON b.winner_id = w.id
          WHERE b.id = ? AND b.status = 'finished'
        `, [battleId]);

        if (!battle) {
          return {
            success: false,
            message: '완료된 배틀을 찾을 수 없습니다.'
          };
        }

        // 배틀 액션 기록 조회
        const actions = await db.all(`
          SELECT ba.*, c.name as character_name, s.name as skill_name
          FROM battle_actions ba
          LEFT JOIN characters c ON ba.character_id = c.id
          LEFT JOIN skills s ON ba.skill_id = s.id
          WHERE ba.battle_id = ?
          ORDER BY ba.turn_number ASC, ba.created_at ASC
        `, [battleId]);

        // 배틀 지속 시간 계산
        const startTime = new Date(battle.created_at);
        const endTime = new Date(battle.finished_at || battle.updated_at);
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

        // 리플레이 데이터 구성
        const replayData: ReplayData = {
          battle,
          actions,
          metadata: {
            startTime,
            endTime,
            duration,
            totalTurns: battle.turn_count,
            winner: battle.winner_name || '무승부'
          }
        };

        // 자동 생성된 타이틀
        const autoTitle = `${battle.player1_name} vs ${battle.player2_name}`;

        // 리플레이 저장
        const result = await db.run(`
          INSERT INTO replays (
            battle_id, title, replay_data, duration, winner_id,
            player1_id, player2_id, total_turns, view_count, is_featured
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
        `, [
          battleId,
          autoTitle,
          JSON.stringify(replayData),
          duration,
          battle.winner_id || null,
          battle.player1_id,
          battle.player2_id,
          battle.turn_count
        ]);

        if (!result.lastID) {
          return {
            success: false,
            message: '리플레이 생성에 실패했습니다.'
          };
        }

        // 생성된 리플레이 정보 반환
        const replay = await this.findById(result.lastID);

        return {
          success: true,
          data: replay!,
          message: '리플레이가 성공적으로 생성되었습니다.'
        };
      });
    } catch (error) {
      console.error('리플레이 생성 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }

  /**
   * ID로 리플레이 조회
   */
  static async findById(id: number): Promise<Replay | null> {
    try {
      const db = await getDatabase();
      
      const replay = await db.get(`
        SELECT r.*,
               p1.name as player1_name,
               p2.name as player2_name,
               w.name as winner_name
        FROM replays r
        LEFT JOIN characters p1 ON r.player1_id = p1.id
        LEFT JOIN characters p2 ON r.player2_id = p2.id
        LEFT JOIN characters w ON r.winner_id = w.id
        WHERE r.id = ?
      `, [id]);

      return replay || null;
    } catch (error) {
      console.error('리플레이 조회 오류:', error);
      return null;
    }
  }

  /**
   * 리플레이 목록 조회
   */
  static async findAll(
    limit: number = 20,
    offset: number = 0,
    filters?: {
      playerId?: number;
      featured?: boolean;
      search?: string;
    }
  ): Promise<Replay[]> {
    try {
      const db = await getDatabase();
      
      let query = `
        SELECT r.*,
               p1.name as player1_name,
               p2.name as player2_name,
               w.name as winner_name
        FROM replays r
        LEFT JOIN characters p1 ON r.player1_id = p1.id
        LEFT JOIN characters p2 ON r.player2_id = p2.id
        LEFT JOIN characters w ON r.winner_id = w.id
        WHERE 1=1
      `;
      
      const params: any[] = [];

      // 필터 적용
      if (filters?.playerId) {
        query += ' AND (r.player1_id = ? OR r.player2_id = ?)';
        params.push(filters.playerId, filters.playerId);
      }

      if (filters?.featured !== undefined) {
        query += ' AND r.is_featured = ?';
        params.push(filters.featured ? 1 : 0);
      }

      if (filters?.search) {
        query += ' AND (r.title LIKE ? OR r.description LIKE ? OR p1.name LIKE ? OR p2.name LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const replays = await db.all(query, params);
      return replays;
    } catch (error) {
      console.error('리플레이 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 리플레이 데이터 조회 (실제 재생용)
   */
  static async getReplayData(id: number): Promise<ReplayData | null> {
    try {
      const replay = await this.findById(id);
      if (!replay) return null;

      // 조회수 증가
      await this.incrementViewCount(id);

      // JSON 데이터 파싱
      const replayData = JSON.parse(replay.replay_data) as ReplayData;
      return replayData;
    } catch (error) {
      console.error('리플레이 데이터 조회 오류:', error);
      return null;
    }
  }

  /**
   * 조회수 증가
   */
  private static async incrementViewCount(id: number): Promise<void> {
    try {
      const db = await getDatabase();
      await db.run('UPDATE replays SET view_count = view_count + 1 WHERE id = ?', [id]);
    } catch (error) {
      console.error('조회수 증가 오류:', error);
    }
  }

  /**
   * 리플레이 정보 수정
   */
  static async update(
    id: number, 
    updates: {
      title?: string;
      description?: string;
      is_featured?: boolean;
    }
  ): Promise<ApiResponse<Replay>> {
    try {
      const db = await getDatabase();
      
      const fields: string[] = [];
      const values: any[] = [];
      
      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      
      if (updates.is_featured !== undefined) {
        fields.push('is_featured = ?');
        values.push(updates.is_featured ? 1 : 0);
      }
      
      if (fields.length === 0) {
        return {
          success: false,
          message: '업데이트할 필드가 없습니다.'
        };
      }
      
      values.push(id);
      
      const query = `UPDATE replays SET ${fields.join(', ')} WHERE id = ?`;
      const result = await db.run(query, values);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '리플레이를 찾을 수 없습니다.'
        };
      }
      
      const updatedReplay = await this.findById(id);
      
      return {
        success: true,
        data: updatedReplay!,
        message: '리플레이가 성공적으로 수정되었습니다.'
      };
    } catch (error) {
      console.error('리플레이 수정 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 리플레이 삭제
   */
  static async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const db = await getDatabase();
      
      const result = await db.run('DELETE FROM replays WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '리플레이를 찾을 수 없습니다.'
        };
      }
      
      return {
        success: true,
        message: '리플레이가 성공적으로 삭제되었습니다.'
      };
    } catch (error) {
      console.error('리플레이 삭제 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 인기 리플레이 조회
   */
  static async getPopularReplays(limit: number = 10): Promise<Replay[]> {
    try {
      const db = await getDatabase();
      
      const replays = await db.all(`
        SELECT r.*,
               p1.name as player1_name,
               p2.name as player2_name,
               w.name as winner_name
        FROM replays r
        LEFT JOIN characters p1 ON r.player1_id = p1.id
        LEFT JOIN characters p2 ON r.player2_id = p2.id
        LEFT JOIN characters w ON r.winner_id = w.id
        WHERE r.created_at > datetime('now', '-7 days')
        ORDER BY r.view_count DESC, r.created_at DESC
        LIMIT ?
      `, [limit]);

      return replays;
    } catch (error) {
      console.error('인기 리플레이 조회 오류:', error);
      return [];
    }
  }

  /**
   * 추천 리플레이 조회
   */
  static async getFeaturedReplays(limit: number = 5): Promise<Replay[]> {
    try {
      const db = await getDatabase();
      
      const replays = await db.all(`
        SELECT r.*,
               p1.name as player1_name,
               p2.name as player2_name,
               w.name as winner_name
        FROM replays r
        LEFT JOIN characters p1 ON r.player1_id = p1.id
        LEFT JOIN characters p2 ON r.player2_id = p2.id
        LEFT JOIN characters w ON r.winner_id = w.id
        WHERE r.is_featured = 1
        ORDER BY r.created_at DESC
        LIMIT ?
      `, [limit]);

      return replays;
    } catch (error) {
      console.error('추천 리플레이 조회 오류:', error);
      return [];
    }
  }

  /**
   * 리플레이 통계
   */
  static async getStats(): Promise<{
    totalReplays: number;
    todayReplays: number;
    totalViews: number;
    avgDuration: number;
    popularReplays: number;
    featuredReplays: number;
  }> {
    try {
      const db = await getDatabase();
      
      const [total, today, views, duration, popular, featured] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM replays'),
        db.get(`
          SELECT COUNT(*) as count FROM replays 
          WHERE DATE(created_at) = DATE('now')
        `),
        db.get('SELECT SUM(view_count) as total FROM replays'),
        db.get('SELECT AVG(duration) as avg FROM replays'),
        db.get('SELECT COUNT(*) as count FROM replays WHERE view_count > 10'),
        db.get('SELECT COUNT(*) as count FROM replays WHERE is_featured = 1')
      ]);

      return {
        totalReplays: total?.count || 0,
        todayReplays: today?.count || 0,
        totalViews: views?.total || 0,
        avgDuration: Math.round(duration?.avg || 0),
        popularReplays: popular?.count || 0,
        featuredReplays: featured?.count || 0
      };
    } catch (error) {
      console.error('리플레이 통계 조회 오류:', error);
      return {
        totalReplays: 0,
        todayReplays: 0,
        totalViews: 0,
        avgDuration: 0,
        popularReplays: 0,
        featuredReplays: 0
      };
    }
  }
}