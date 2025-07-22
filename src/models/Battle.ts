import { getDatabase, runTransaction } from '../config/database';
import { Battle, BattleAction, BattleStatus, ActionType, Character, ApiResponse } from '../types';

export class BattleModel {
  /**
   * 새 배틀 생성
   */
  static async create(player1Id: number, player2Id: number): Promise<ApiResponse<Battle>> {
    try {
      return await runTransaction(async (db) => {
        // 플레이어들이 이미 다른 배틀에 참여 중인지 확인
        const activeB1 = await db.get(`
          SELECT id FROM battles 
          WHERE (player1_id = ? OR player2_id = ?) AND status IN ('waiting', 'in_progress')
        `, [player1Id, player1Id]);
        
        const activeB2 = await db.get(`
          SELECT id FROM battles 
          WHERE (player1_id = ? OR player2_id = ?) AND status IN ('waiting', 'in_progress')
        `, [player2Id, player2Id]);
        
        if (activeB1 || activeB2) {
          return {
            success: false,
            message: '플레이어 중 한 명이 이미 다른 배틀에 참여 중입니다.'
          };
        }
        
        // 배틀 생성
        const result = await db.run(`
          INSERT INTO battles (player1_id, player2_id, status, turn_count, current_turn)
          VALUES (?, ?, 'waiting', 0, 1)
        `, [player1Id, player2Id]);
        
        if (!result.lastID) {
          return {
            success: false,
            message: '배틀 생성에 실패했습니다.'
          };
        }
        
        // 생성된 배틀 정보 조회
        const battle = await this.findById(result.lastID);
        
        return {
          success: true,
          data: battle!,
          message: '배틀이 성공적으로 생성되었습니다.'
        };
      });
    } catch (error) {
      console.error('배틀 생성 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 배틀 시작
   */
  static async startBattle(battleId: number): Promise<ApiResponse<Battle>> {
    try {
      return await runTransaction(async (db) => {
        // 배틀 상태 업데이트
        const result = await db.run(`
          UPDATE battles 
          SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'waiting'
        `, [battleId]);
        
        if (result.changes === 0) {
          return {
            success: false,
            message: '배틀을 시작할 수 없습니다. (이미 시작되었거나 존재하지 않음)'
          };
        }
        
        // 플레이어들의 체력/마나를 최대치로 회복
        await db.run(`
          UPDATE characters 
          SET health = max_health, mana = max_mana 
          WHERE id IN (
            SELECT player1_id FROM battles WHERE id = ?
            UNION
            SELECT player2_id FROM battles WHERE id = ?
          )
        `, [battleId, battleId]);
        
        const battle = await this.findById(battleId);
        
        return {
          success: true,
          data: battle!,
          message: '배틀이 시작되었습니다.'
        };
      });
    } catch (error) {
      console.error('배틀 시작 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * ID로 배틀 조회 (상세 정보 포함)
   */
  static async findById(id: number): Promise<Battle | null> {
    try {
      const db = await getDatabase();
      
      const battle = await db.get(`
        SELECT b.*, 
               p1.name as player1_name, p1.level as player1_level,
               p1.health as player1_health, p1.max_health as player1_max_health,
               p1.mana as player1_mana, p1.max_mana as player1_max_mana,
               p1.strength as player1_strength, p1.defense as player1_defense, p1.speed as player1_speed,
               p2.name as player2_name, p2.level as player2_level,
               p2.health as player2_health, p2.max_health as player2_max_health,
               p2.mana as player2_mana, p2.max_mana as player2_max_mana,
               p2.strength as player2_strength, p2.defense as player2_defense, p2.speed as player2_speed,
               w.name as winner_name
        FROM battles b
        LEFT JOIN characters p1 ON b.player1_id = p1.id
        LEFT JOIN characters p2 ON b.player2_id = p2.id
        LEFT JOIN characters w ON b.winner_id = w.id
        WHERE b.id = ?
      `, [id]);
      
      if (!battle) return null;
      
      // 배틀 액션 히스토리 조회
      const actions = await db.all(`
        SELECT ba.*, c.name as character_name, s.name as skill_name
        FROM battle_actions ba
        LEFT JOIN characters c ON ba.character_id = c.id
        LEFT JOIN skills s ON ba.skill_id = s.id
        WHERE ba.battle_id = ?
        ORDER BY ba.turn_number ASC, ba.created_at ASC
      `, [id]);
      
      battle.battleLog = actions;
      
      return battle;
    } catch (error) {
      console.error('배틀 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 사용자의 현재 배틀 조회
   */
  static async findActiveByCharacterId(characterId: number): Promise<Battle | null> {
    try {
      const db = await getDatabase();
      
      const battle = await db.get(`
        SELECT * FROM battles 
        WHERE (player1_id = ? OR player2_id = ?) 
        AND status IN ('waiting', 'in_progress')
        ORDER BY created_at DESC
        LIMIT 1
      `, [characterId, characterId]);
      
      if (!battle) return null;
      
      return this.findById(battle.id);
    } catch (error) {
      console.error('활성 배틀 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 배틀 액션 수행
   */
  static async performAction(
    battleId: number,
    characterId: number,
    actionType: ActionType,
    skillId?: number,
    targetId?: number
  ): Promise<ApiResponse<{ battle: Battle; action: BattleAction }>> {
    try {
      return await runTransaction(async (db) => {
        // 배틀과 캐릭터 정보 조회
        const battle = await this.findById(battleId);
        if (!battle) {
          return {
            success: false,
            message: '배틀을 찾을 수 없습니다.'
          };
        }
        
        if (battle.status !== 'in_progress') {
          return {
            success: false,
            message: '진행 중인 배틀이 아닙니다.'
          };
        }
        
        // 턴 체크
        const isPlayer1 = battle.player1_id === characterId;
        const isPlayer2 = battle.player2_id === characterId;
        
        if (!isPlayer1 && !isPlayer2) {
          return {
            success: false,
            message: '이 배틀에 참여하지 않는 캐릭터입니다.'
          };
        }
        
        const currentPlayerTurn = battle.current_turn % 2 === 1 ? battle.player1_id : battle.player2_id;
        if (currentPlayerTurn !== characterId) {
          return {
            success: false,
            message: '당신의 턴이 아닙니다.'
          };
        }
        
        // 액션 실행
        const actionResult = await this.executeAction(
          db, battle, characterId, actionType, skillId, targetId
        );
        
        if (!actionResult.success) {
          return actionResult;
        }
        
        // 턴 증가
        await db.run(`
          UPDATE battles 
          SET turn_count = turn_count + 1, 
              current_turn = current_turn + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [battleId]);
        
        // 승부 판정
        const battleResult = await this.checkBattleEnd(battleId);
        
        // 업데이트된 배틀 정보 반환
        const updatedBattle = await this.findById(battleId);
        
        return {
          success: true,
          data: {
            battle: updatedBattle!,
            action: actionResult.data!
          },
          message: battleResult ? `배틀이 종료되었습니다. 승자: ${battleResult}` : '액션이 성공적으로 수행되었습니다.'
        };
      });
    } catch (error) {
      console.error('배틀 액션 수행 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 실제 액션 실행
   */
  private static async executeAction(
    db: any,
    battle: Battle,
    characterId: number,
    actionType: ActionType,
    skillId?: number,
    targetId?: number
  ): Promise<ApiResponse<BattleAction>> {
    try {
      let damage = 0;
      let healAmount = 0;
      let manaCost = 0;
      
      // 공격자와 대상 결정
      const isPlayer1 = battle.player1_id === characterId;
      const attackerId = characterId;
      const defenderId = targetId || (isPlayer1 ? battle.player2_id : battle.player1_id);
      
      // 공격자 정보 조회
      const attacker = await db.get('SELECT * FROM characters WHERE id = ?', [attackerId]);
      
      switch (actionType) {
        case 'attack':
          // 기본 공격
          damage = Math.floor(attacker.strength * (0.8 + Math.random() * 0.4)); // 80-120% 랜덤
          break;
          
        case 'skill':
          if (!skillId) {
            return {
              success: false,
              message: '스킬 ID가 필요합니다.'
            };
          }
          
          // 스킬 정보 조회
          const skill = await db.get(`
            SELECT s.*, cs.level as skill_level
            FROM skills s
            JOIN character_skills cs ON s.id = cs.skill_id
            WHERE s.id = ? AND cs.character_id = ?
          `, [skillId, characterId]);
          
          if (!skill) {
            return {
              success: false,
              message: '보유하지 않은 스킬입니다.'
            };
          }
          
          // 마나 체크
          if (attacker.mana < skill.mana_cost) {
            return {
              success: false,
              message: '마나가 부족합니다.'
            };
          }
          
          manaCost = skill.mana_cost;
          
          // 스킬 타입에 따른 효과
          switch (skill.skill_type) {
            case 'attack':
              damage = skill.damage + (skill.skill_level - 1) * 5;
              break;
            case 'heal':
              healAmount = skill.heal_amount + (skill.skill_level - 1) * 5;
              break;
            case 'defense':
              // 방어 효과는 다음 턴까지 적용 (간단 구현)
              break;
          }
          break;
          
        case 'defend':
          // 방어 액션 (데미지 50% 감소 효과)
          break;
          
        default:
          return {
            success: false,
            message: '알 수 없는 액션 타입입니다.'
          };
      }
      
      // 데미지 적용 (대상에게)
      if (damage > 0) {
        const defender = await db.get('SELECT * FROM characters WHERE id = ?', [defenderId]);
        const actualDamage = Math.max(1, damage - Math.floor(defender.defense / 2));
        
        await db.run(`
          UPDATE characters 
          SET health = MAX(0, health - ?)
          WHERE id = ?
        `, [actualDamage, defenderId]);
        
        damage = actualDamage;
      }
      
      // 치유 적용 (자신에게)
      if (healAmount > 0) {
        await db.run(`
          UPDATE characters 
          SET health = MIN(max_health, health + ?)
          WHERE id = ?
        `, [healAmount, attackerId]);
      }
      
      // 마나 소모
      if (manaCost > 0) {
        await db.run(`
          UPDATE characters 
          SET mana = mana - ?
          WHERE id = ?
        `, [manaCost, attackerId]);
      }
      
      // 배틀 액션 기록
      const actionResult = await db.run(`
        INSERT INTO battle_actions (
          battle_id, character_id, action_type, skill_id, target_id,
          damage, heal_amount, turn_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        battle.id, characterId, actionType, skillId || null, defenderId,
        damage, healAmount, battle.turn_count + 1
      ]);
      
      const action = await db.get(`
        SELECT ba.*, c.name as character_name, s.name as skill_name
        FROM battle_actions ba
        LEFT JOIN characters c ON ba.character_id = c.id
        LEFT JOIN skills s ON ba.skill_id = s.id
        WHERE ba.id = ?
      `, [actionResult.lastID]);
      
      return {
        success: true,
        data: action,
        message: '액션이 성공적으로 실행되었습니다.'
      };
      
    } catch (error) {
      console.error('액션 실행 오류:', error);
      return {
        success: false,
        message: '액션 실행 중 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 배틀 종료 체크
   */
  private static async checkBattleEnd(battleId: number): Promise<string | null> {
    try {
      const db = await getDatabase();
      
      const battle = await db.get(`
        SELECT b.*, p1.health as p1_health, p2.health as p2_health,
               p1.name as p1_name, p2.name as p2_name
        FROM battles b
        JOIN characters p1 ON b.player1_id = p1.id
        JOIN characters p2 ON b.player2_id = p2.id
        WHERE b.id = ?
      `, [battleId]);
      
      if (!battle) return null;
      
      let winnerId = null;
      let winnerName = null;
      
      // 체력 기준 승부 판정
      if (battle.p1_health <= 0 && battle.p2_health <= 0) {
        // 무승부
        await db.run(`
          UPDATE battles 
          SET status = 'finished', finished_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [battleId]);
        
        // 랭킹 업데이트 (무승부)
        await this.updateRankings(battle.player1_id, battle.player2_id, null);
        
        return '무승부';
      } else if (battle.p1_health <= 0) {
        // 플레이어2 승리
        winnerId = battle.player2_id;
        winnerName = battle.p2_name;
      } else if (battle.p2_health <= 0) {
        // 플레이어1 승리
        winnerId = battle.player1_id;
        winnerName = battle.p1_name;
      } else if (battle.turn_count >= 50) {
        // 최대 턴 수 도달 - 체력 비율로 승부 결정
        const p1Ratio = battle.p1_health / battle.p1_max_health;
        const p2Ratio = battle.p2_health / battle.p2_max_health;
        
        if (p1Ratio > p2Ratio) {
          winnerId = battle.player1_id;
          winnerName = battle.p1_name;
        } else if (p2Ratio > p1Ratio) {
          winnerId = battle.player2_id;
          winnerName = battle.p2_name;
        } else {
          // 완전 무승부
          await db.run(`
            UPDATE battles 
            SET status = 'finished', finished_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [battleId]);
          
          await this.updateRankings(battle.player1_id, battle.player2_id, null);
          
          // 리플레이 생성
          await this.createReplay(battleId);
          
          return '무승부';
        }
      }
      
      if (winnerId) {
        // 배틀 종료
        await db.run(`
          UPDATE battles 
          SET status = 'finished', winner_id = ?, finished_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [winnerId, battleId]);
        
        // 랭킹 업데이트
        await this.updateRankings(battle.player1_id, battle.player2_id, winnerId);
        
        // 경험치 지급
        await this.giveExperience(battle.player1_id, battle.player2_id, winnerId);
        
        // 리플레이 생성
        await this.createReplay(battleId);
        
        return winnerName;
      }
      
      return null;
    } catch (error) {
      console.error('배틀 종료 체크 오류:', error);
      return null;
    }
  }
  
  /**
   * 랭킹 업데이트
   */
  private static async updateRankings(player1Id: number, player2Id: number, winnerId: number | null): Promise<void> {
    try {
      const db = await getDatabase();
      
      if (winnerId === null) {
        // 무승부
        await db.run('UPDATE rankings SET draws = draws + 1 WHERE character_id IN (?, ?)', [player1Id, player2Id]);
      } else if (winnerId === player1Id) {
        // 플레이어1 승리
        await db.run('UPDATE rankings SET wins = wins + 1, points = points + 20 WHERE character_id = ?', [player1Id]);
        await db.run('UPDATE rankings SET losses = losses + 1, points = MAX(points - 10, 0) WHERE character_id = ?', [player2Id]);
      } else {
        // 플레이어2 승리
        await db.run('UPDATE rankings SET wins = wins + 1, points = points + 20 WHERE character_id = ?', [player2Id]);
        await db.run('UPDATE rankings SET losses = losses + 1, points = MAX(points - 10, 0) WHERE character_id = ?', [player1Id]);
      }
      
      // 랭킹 재계산
      await this.recalculateRankings();
    } catch (error) {
      console.error('랭킹 업데이트 오류:', error);
    }
  }
  
  /**
   * 경험치 지급
   */
  private static async giveExperience(player1Id: number, player2Id: number, winnerId: number | null): Promise<void> {
    try {
      const db = await getDatabase();
      
      const winnerExp = 100;
      const loserExp = 50;
      
      if (winnerId === null) {
        // 무승부 - 둘 다 절반 경험치
        await db.run('UPDATE characters SET experience = experience + ? WHERE id IN (?, ?)', [75, player1Id, player2Id]);
      } else {
        // 승자와 패자 경험치 차등 지급
        const loserId = winnerId === player1Id ? player2Id : player1Id;
        await db.run('UPDATE characters SET experience = experience + ? WHERE id = ?', [winnerExp, winnerId]);
        await db.run('UPDATE characters SET experience = experience + ? WHERE id = ?', [loserExp, loserId]);
      }
    } catch (error) {
      console.error('경험치 지급 오류:', error);
    }
  }
  
  /**
   * 랭킹 재계산
   */
  private static async recalculateRankings(): Promise<void> {
    try {
      const db = await getDatabase();
      
      // 포인트 순으로 랭킹 재계산
      await db.run(`
        UPDATE rankings 
        SET rank = (
          SELECT COUNT(*) + 1
          FROM rankings r2 
          WHERE r2.points > rankings.points
        )
      `);
    } catch (error) {
      console.error('랭킹 재계산 오류:', error);
    }
  }
  
  /**
   * 배틀 포기
   */
  static async surrender(battleId: number, characterId: number): Promise<ApiResponse<Battle>> {
    try {
      return await runTransaction(async (db) => {
        const battle = await this.findById(battleId);
        if (!battle) {
          return {
            success: false,
            message: '배틀을 찾을 수 없습니다.'
          };
        }
        
        if (battle.status !== 'in_progress') {
          return {
            success: false,
            message: '진행 중인 배틀이 아닙니다.'
          };
        }
        
        // 항복한 플레이어 확인
        const isPlayer1 = battle.player1_id === characterId;
        const isPlayer2 = battle.player2_id === characterId;
        
        if (!isPlayer1 && !isPlayer2) {
          return {
            success: false,
            message: '이 배틀에 참여하지 않는 캐릭터입니다.'
          };
        }
        
        // 승자 결정 (항복하지 않은 플레이어)
        const winnerId = isPlayer1 ? battle.player2_id : battle.player1_id;
        
        // 배틀 종료
        await db.run(`
          UPDATE battles 
          SET status = 'finished', winner_id = ?, finished_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [winnerId, battleId]);
        
        // 랭킹 업데이트
        await this.updateRankings(battle.player1_id, battle.player2_id, winnerId);
        
        // 경험치 지급 (항복시 승자만 경험치)
        await db.run('UPDATE characters SET experience = experience + ? WHERE id = ?', [50, winnerId]);
        
        const updatedBattle = await this.findById(battleId);
        
        return {
          success: true,
          data: updatedBattle!,
          message: '배틀에서 항복했습니다.'
        };
      });
    } catch (error) {
      console.error('배틀 항복 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 리플레이 생성
   */
  private static async createReplay(battleId: number): Promise<void> {
    try {
      const { ReplayModel } = await import('./Replay');
      await ReplayModel.createFromBattle(battleId);
      console.log(`배틀 ${battleId}의 리플레이가 생성되었습니다.`);
    } catch (error) {
      console.error(`배틀 ${battleId} 리플레이 생성 오류:`, error);
      // 리플레이 생성 실패해도 배틀 종료는 계속 진행
    }
  }

  /**
   * 배틀 통계
   */
  static async getStats(): Promise<{
    totalBattles: number;
    activeBattles: number;
    finishedToday: number;
    averageTurns: number;
  }> {
    try {
      const db = await getDatabase();
      
      const [totalResult, activeResult, todayResult, avgTurnsResult] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM battles'),
        db.get('SELECT COUNT(*) as count FROM battles WHERE status = "in_progress"'),
        db.get(`
          SELECT COUNT(*) as count FROM battles 
          WHERE DATE(finished_at) = DATE('now') AND status = 'finished'
        `),
        db.get('SELECT AVG(turn_count) as avg FROM battles WHERE status = "finished"')
      ]);
      
      return {
        totalBattles: totalResult.count || 0,
        activeBattles: activeResult.count || 0,
        finishedToday: todayResult.count || 0,
        averageTurns: Math.round(avgTurnsResult.avg || 0)
      };
      
    } catch (error) {
      console.error('배틀 통계 조회 오류:', error);
      return {
        totalBattles: 0,
        activeBattles: 0,
        finishedToday: 0,
        averageTurns: 0
      };
    }
  }
}