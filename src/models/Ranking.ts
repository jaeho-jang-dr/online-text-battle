import { getDatabase } from '../config/database';
import { ApiResponse, Ranking } from '../types';

export interface RankingStats {
  character_id: number;
  character_name: string;
  username: string;
  level: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  rank: number;
  win_rate: number;
  total_battles: number;
  recent_form: 'winning' | 'losing' | 'stable' | 'new'; // 최근 경기 결과 추세
  updated_at: Date;
}

export interface LeaderboardEntry extends RankingStats {
  rank_change?: number; // 이전 랭킹과의 변화 (+1, -1, 0)
  streak?: number; // 연승/연패 수
  streak_type?: 'win' | 'loss';
}

export class RankingModel {
  /**
   * 전체 랭킹 조회
   */
  static async getLeaderboard(
    limit: number = 50,
    offset: number = 0,
    season?: string
  ): Promise<LeaderboardEntry[]> {
    try {
      const db = await getDatabase();
      
      let query = `
        SELECT r.*, c.name as character_name, c.level, u.username,
               CASE 
                 WHEN (r.wins + r.losses + r.draws) = 0 THEN 0
                 ELSE ROUND(r.wins * 100.0 / (r.wins + r.losses + r.draws), 2)
               END as win_rate,
               (r.wins + r.losses + r.draws) as total_battles
        FROM rankings r
        JOIN characters c ON r.character_id = c.id
        JOIN users u ON c.user_id = u.id
      `;
      
      const params: any[] = [];

      // 시즌 필터 (향후 확장 가능)
      if (season) {
        query += ' WHERE r.season = ?';
        params.push(season);
      } else {
        query += ' WHERE 1=1';
      }

      query += ' ORDER BY r.points DESC, r.wins DESC, r.character_id ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rankings = await db.all(query, params);

      // 순위 설정 및 최근 동향 분석
      const leaderboard: LeaderboardEntry[] = [];
      for (let i = 0; i < rankings.length; i++) {
        const ranking = rankings[i];
        const actualRank = offset + i + 1;

        // 최근 경기 동향 분석
        const recentForm = await this.analyzeRecentForm(ranking.character_id);
        
        // 연승/연패 분석
        const streak = await this.getCurrentStreak(ranking.character_id);

        leaderboard.push({
          ...ranking,
          rank: actualRank,
          recent_form: recentForm,
          ...streak
        });
      }

      return leaderboard;
    } catch (error) {
      console.error('리더보드 조회 오류:', error);
      return [];
    }
  }

  /**
   * 특정 캐릭터의 랭킹 정보 조회
   */
  static async getCharacterRanking(characterId: number): Promise<RankingStats | null> {
    try {
      const db = await getDatabase();
      
      const ranking = await db.get(`
        SELECT r.*, c.name as character_name, c.level, u.username,
               CASE 
                 WHEN (r.wins + r.losses + r.draws) = 0 THEN 0
                 ELSE ROUND(r.wins * 100.0 / (r.wins + r.losses + r.draws), 2)
               END as win_rate,
               (r.wins + r.losses + r.draws) as total_battles
        FROM rankings r
        JOIN characters c ON r.character_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE r.character_id = ?
      `, [characterId]);

      if (!ranking) return null;

      // 최근 경기 동향 분석
      const recentForm = await this.analyzeRecentForm(characterId);

      return {
        ...ranking,
        recent_form: recentForm
      };
    } catch (error) {
      console.error('캐릭터 랭킹 조회 오류:', error);
      return null;
    }
  }

  /**
   * 레벨별 랭킹 조회
   */
  static async getRankingsByLevel(
    minLevel: number = 1,
    maxLevel: number = 100,
    limit: number = 20
  ): Promise<LeaderboardEntry[]> {
    try {
      const db = await getDatabase();
      
      const rankings = await db.all(`
        SELECT r.*, c.name as character_name, c.level, u.username,
               CASE 
                 WHEN (r.wins + r.losses + r.draws) = 0 THEN 0
                 ELSE ROUND(r.wins * 100.0 / (r.wins + r.losses + r.draws), 2)
               END as win_rate,
               (r.wins + r.losses + r.draws) as total_battles
        FROM rankings r
        JOIN characters c ON r.character_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE c.level BETWEEN ? AND ?
        ORDER BY r.points DESC, r.wins DESC
        LIMIT ?
      `, [minLevel, maxLevel, limit]);

      // 순위 및 동향 분석
      const leaderboard: LeaderboardEntry[] = [];
      for (let i = 0; i < rankings.length; i++) {
        const ranking = rankings[i];
        const recentForm = await this.analyzeRecentForm(ranking.character_id);
        const streak = await this.getCurrentStreak(ranking.character_id);

        leaderboard.push({
          ...ranking,
          rank: i + 1,
          recent_form: recentForm,
          ...streak
        });
      }

      return leaderboard;
    } catch (error) {
      console.error('레벨별 랭킹 조회 오류:', error);
      return [];
    }
  }

  /**
   * 주간 랭킹 조회
   */
  static async getWeeklyRankings(limit: number = 20): Promise<LeaderboardEntry[]> {
    try {
      const db = await getDatabase();
      
      // 지난 주 배틀 기록을 기반으로 한 임시 랭킹 계산
      const rankings = await db.all(`
        SELECT 
          c.id as character_id,
          c.name as character_name,
          c.level,
          u.username,
          COUNT(CASE WHEN b.winner_id = c.id THEN 1 END) as wins,
          COUNT(CASE WHEN b.winner_id IS NOT NULL AND b.winner_id != c.id THEN 1 END) as losses,
          COUNT(CASE WHEN b.winner_id IS NULL THEN 1 END) as draws,
          COUNT(*) as total_battles,
          (COUNT(CASE WHEN b.winner_id = c.id THEN 1 END) * 20 - 
           COUNT(CASE WHEN b.winner_id IS NOT NULL AND b.winner_id != c.id THEN 1 END) * 10) as weekly_points,
          CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(COUNT(CASE WHEN b.winner_id = c.id THEN 1 END) * 100.0 / COUNT(*), 2)
          END as win_rate
        FROM characters c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN battles b ON (b.player1_id = c.id OR b.player2_id = c.id)
          AND b.status = 'finished'
          AND b.finished_at > datetime('now', '-7 days')
        GROUP BY c.id, c.name, c.level, u.username
        HAVING total_battles > 0
        ORDER BY weekly_points DESC, wins DESC
        LIMIT ?
      `, [limit]);

      const leaderboard: LeaderboardEntry[] = rankings.map((ranking, index) => ({
        character_id: ranking.character_id,
        character_name: ranking.character_name,
        username: ranking.username,
        level: ranking.level,
        wins: ranking.wins,
        losses: ranking.losses,
        draws: ranking.draws,
        points: ranking.weekly_points,
        rank: index + 1,
        win_rate: ranking.win_rate,
        total_battles: ranking.total_battles,
        recent_form: 'stable' as const,
        updated_at: new Date()
      }));

      return leaderboard;
    } catch (error) {
      console.error('주간 랭킹 조회 오류:', error);
      return [];
    }
  }

  /**
   * 최근 경기 동향 분석
   */
  private static async analyzeRecentForm(characterId: number): Promise<'winning' | 'losing' | 'stable' | 'new'> {
    try {
      const db = await getDatabase();
      
      // 최근 10경기 결과 조회
      const recentBattles = await db.all(`
        SELECT 
          CASE 
            WHEN winner_id = ? THEN 'win'
            WHEN winner_id IS NULL THEN 'draw'
            ELSE 'loss'
          END as result
        FROM battles 
        WHERE (player1_id = ? OR player2_id = ?) 
          AND status = 'finished'
        ORDER BY finished_at DESC
        LIMIT 10
      `, [characterId, characterId, characterId]);

      if (recentBattles.length < 5) {
        return 'new';
      }

      // 최근 5경기 분석
      const recent5 = recentBattles.slice(0, 5);
      const wins = recent5.filter(b => b.result === 'win').length;
      const losses = recent5.filter(b => b.result === 'loss').length;

      if (wins >= 4) return 'winning';
      if (losses >= 4) return 'losing';
      return 'stable';
    } catch (error) {
      console.error('최근 경기 동향 분석 오류:', error);
      return 'stable';
    }
  }

  /**
   * 현재 연승/연패 수 조회
   */
  private static async getCurrentStreak(characterId: number): Promise<{ streak?: number; streak_type?: 'win' | 'loss' }> {
    try {
      const db = await getDatabase();
      
      // 최근 경기부터 연속된 결과 찾기
      const recentBattles = await db.all(`
        SELECT 
          CASE 
            WHEN winner_id = ? THEN 'win'
            WHEN winner_id IS NULL THEN 'draw'
            ELSE 'loss'
          END as result
        FROM battles 
        WHERE (player1_id = ? OR player2_id = ?) 
          AND status = 'finished'
        ORDER BY finished_at DESC
        LIMIT 20
      `, [characterId, characterId, characterId]);

      if (recentBattles.length === 0) {
        return {};
      }

      const firstResult = recentBattles[0].result;
      if (firstResult === 'draw') {
        return {};
      }

      let streak = 0;
      for (const battle of recentBattles) {
        if (battle.result === firstResult) {
          streak++;
        } else {
          break;
        }
      }

      return {
        streak,
        streak_type: firstResult as 'win' | 'loss'
      };
    } catch (error) {
      console.error('연승/연패 분석 오류:', error);
      return {};
    }
  }

  /**
   * 랭킹 통계
   */
  static async getRankingStats(): Promise<{
    totalPlayers: number;
    activePlayers: number; // 최근 7일 내 게임한 플레이어
    averagePoints: number;
    topPlayerPoints: number;
    newPlayersThisWeek: number;
  }> {
    try {
      const db = await getDatabase();
      
      const [total, active, avgPoints, topPoints, newPlayers] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM rankings'),
        db.get(`
          SELECT COUNT(DISTINCT r.character_id) as count 
          FROM rankings r
          JOIN characters c ON r.character_id = c.id
          WHERE EXISTS (
            SELECT 1 FROM battles b 
            WHERE (b.player1_id = c.id OR b.player2_id = c.id)
              AND b.finished_at > datetime('now', '-7 days')
          )
        `),
        db.get('SELECT AVG(points) as avg FROM rankings'),
        db.get('SELECT MAX(points) as max FROM rankings'),
        db.get(`
          SELECT COUNT(*) as count FROM rankings r
          JOIN characters c ON r.character_id = c.id
          WHERE c.created_at > datetime('now', '-7 days')
        `)
      ]);

      return {
        totalPlayers: total?.count || 0,
        activePlayers: active?.count || 0,
        averagePoints: Math.round(avgPoints?.avg || 0),
        topPlayerPoints: topPoints?.max || 0,
        newPlayersThisWeek: newPlayers?.count || 0
      };
    } catch (error) {
      console.error('랭킹 통계 조회 오류:', error);
      return {
        totalPlayers: 0,
        activePlayers: 0,
        averagePoints: 0,
        topPlayerPoints: 0,
        newPlayersThisWeek: 0
      };
    }
  }

  /**
   * 캐릭터 주변 랭킹 조회 (내 앞뒤 플레이어들)
   */
  static async getNearbyRankings(characterId: number, range: number = 5): Promise<LeaderboardEntry[]> {
    try {
      const db = await getDatabase();
      
      // 먼저 해당 캐릭터의 현재 랭크 조회
      const characterRank = await db.get(`
        SELECT COUNT(*) + 1 as rank
        FROM rankings r1
        JOIN rankings r2 ON r1.character_id = ?
        WHERE r1.points > r2.points
          OR (r1.points = r2.points AND r1.wins > r2.wins)
          OR (r1.points = r2.points AND r1.wins = r2.wins AND r1.character_id < r2.character_id)
      `, [characterId]);

      if (!characterRank) {
        return [];
      }

      const currentRank = characterRank.rank;
      const startRank = Math.max(1, currentRank - range);
      const endRank = currentRank + range;

      // 주변 랭킹 조회
      const leaderboard = await this.getLeaderboard(endRank - startRank + 1, startRank - 1);
      
      return leaderboard;
    } catch (error) {
      console.error('주변 랭킹 조회 오류:', error);
      return [];
    }
  }

  /**
   * 랭킹 히스토리 업데이트 (일일 스냅샷)
   */
  static async createDailySnapshot(): Promise<void> {
    try {
      const db = await getDatabase();
      
      // 오늘 날짜의 스냅샷이 이미 있는지 확인
      const existingSnapshot = await db.get(`
        SELECT id FROM ranking_history 
        WHERE DATE(created_at) = DATE('now')
        LIMIT 1
      `);

      if (existingSnapshot) {
        console.log('오늘의 랭킹 스냅샷이 이미 존재합니다.');
        return;
      }

      // 현재 랭킹 상위 100명의 스냅샷 생성
      const topRankings = await this.getLeaderboard(100, 0);
      
      for (const ranking of topRankings) {
        await db.run(`
          INSERT INTO ranking_history (
            character_id, rank, points, wins, losses, draws, snapshot_date
          ) VALUES (?, ?, ?, ?, ?, ?, DATE('now'))
        `, [
          ranking.character_id,
          ranking.rank,
          ranking.points,
          ranking.wins,
          ranking.losses,
          ranking.draws
        ]);
      }

      console.log(`${topRankings.length}명의 랭킹 스냅샷이 생성되었습니다.`);
    } catch (error) {
      console.error('랭킹 스냅샷 생성 오류:', error);
    }
  }
}