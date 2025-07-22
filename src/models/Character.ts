import { getDatabase } from '../config/database';
import { Character, ApiResponse, SkillType } from '../types';

export class CharacterModel {
  /**
   * 새 캐릭터 생성
   */
  static async create(
    userId: number, 
    name: string,
    characterClass: 'warrior' | 'mage' | 'archer' = 'warrior'
  ): Promise<ApiResponse<Character>> {
    try {
      const db = await getDatabase();
      
      // 캐릭터 이름 중복 검사
      const existingCharacter = await db.get(
        'SELECT id FROM characters WHERE user_id = ? AND name = ?',
        [userId, name]
      );
      
      if (existingCharacter) {
        return {
          success: false,
          message: '이미 존재하는 캐릭터 이름입니다.'
        };
      }
      
      // 클래스별 기본 스탯 설정
      const baseStats = this.getBaseStats(characterClass);
      
      // 캐릭터 생성
      const result = await db.run(`
        INSERT INTO characters (
          user_id, name, level, health, max_health, mana, max_mana,
          strength, defense, speed, experience
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, name, 1, 
        baseStats.maxHealth, baseStats.maxHealth,
        baseStats.maxMana, baseStats.maxMana,
        baseStats.strength, baseStats.defense, baseStats.speed, 0
      ]);
      
      if (!result.lastID) {
        return {
          success: false,
          message: '캐릭터 생성에 실패했습니다.'
        };
      }
      
      // 기본 스킬 추가
      await this.addDefaultSkills(result.lastID, characterClass);
      
      // 랭킹 정보 생성
      await db.run(`
        INSERT INTO rankings (character_id, wins, losses, draws, points)
        VALUES (?, 0, 0, 0, ?)
      `, [result.lastID, 1000]); // 기본 1000점으로 시작
      
      // 생성된 캐릭터 정보 반환
      const newCharacter = await this.findById(result.lastID);
      
      return {
        success: true,
        data: newCharacter!,
        message: '캐릭터가 성공적으로 생성되었습니다.'
      };
      
    } catch (error) {
      console.error('캐릭터 생성 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 클래스별 기본 스탯 반환
   */
  private static getBaseStats(characterClass: string) {
    switch (characterClass) {
      case 'warrior':
        return {
          maxHealth: 120,
          maxMana: 30,
          strength: 15,
          defense: 12,
          speed: 8
        };
      case 'mage':
        return {
          maxHealth: 80,
          maxMana: 80,
          strength: 8,
          defense: 6,
          speed: 12
        };
      case 'archer':
        return {
          maxHealth: 100,
          maxMana: 50,
          strength: 12,
          defense: 8,
          speed: 15
        };
      default:
        return {
          maxHealth: 100,
          maxMana: 50,
          strength: 10,
          defense: 8,
          speed: 10
        };
    }
  }
  
  /**
   * 클래스별 기본 스킬 추가
   */
  private static async addDefaultSkills(characterId: number, characterClass: string): Promise<void> {
    try {
      const db = await getDatabase();
      
      // 모든 캐릭터가 가지는 기본 스킬
      const basicSkills = [1]; // 기본 공격
      
      // 클래스별 추가 스킬
      let classSkills: number[] = [];
      switch (characterClass) {
        case 'warrior':
          classSkills = [2, 4]; // 강타, 방어 태세
          break;
        case 'mage':
          classSkills = [3, 5, 9]; // 치유, 파이어볼, 매직 쉴드
          break;
        case 'archer':
          classSkills = [2, 6]; // 강타, 아이스 스피어
          break;
      }
      
      const allSkills = [...basicSkills, ...classSkills];
      
      for (const skillId of allSkills) {
        await db.run(`
          INSERT INTO character_skills (character_id, skill_id, level)
          VALUES (?, ?, 1)
        `, [characterId, skillId]);
      }
      
    } catch (error) {
      console.error('기본 스킬 추가 오류:', error);
    }
  }
  
  /**
   * ID로 캐릭터 조회
   */
  static async findById(id: number): Promise<Character | null> {
    try {
      const db = await getDatabase();
      
      const character = await db.get(`
        SELECT c.*, u.username,
               r.wins, r.losses, r.draws, r.points, r.rank
        FROM characters c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN rankings r ON c.id = r.character_id
        WHERE c.id = ?
      `, [id]);
      
      if (!character) return null;
      
      // 캐릭터 스킬 조회
      const skills = await this.getCharacterSkills(id);
      character.skills = skills;
      
      return character;
    } catch (error) {
      console.error('캐릭터 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 사용자 ID로 캐릭터 목록 조회
   */
  static async findByUserId(userId: number): Promise<Character[]> {
    try {
      const db = await getDatabase();
      
      const characters = await db.all(`
        SELECT c.*, r.wins, r.losses, r.draws, r.points, r.rank
        FROM characters c
        LEFT JOIN rankings r ON c.id = r.character_id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `, [userId]);
      
      // 각 캐릭터의 스킬 정보 추가
      for (const character of characters) {
        character.skills = await this.getCharacterSkills(character.id);
      }
      
      return characters;
    } catch (error) {
      console.error('사용자 캐릭터 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 모든 캐릭터 목록 조회 (관리자용)
   */
  static async findAll(limit: number = 100, offset: number = 0): Promise<Character[]> {
    try {
      const db = await getDatabase();
      
      const characters = await db.all(`
        SELECT c.*, u.username, 
               r.wins, r.losses, r.draws, r.points, r.rank
        FROM characters c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN rankings r ON c.id = r.character_id
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      return characters;
    } catch (error) {
      console.error('캐릭터 목록 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 캐릭터 스킬 조회
   */
  static async getCharacterSkills(characterId: number): Promise<any[]> {
    try {
      const db = await getDatabase();
      
      const skills = await db.all(`
        SELECT s.*, cs.level as skill_level
        FROM character_skills cs
        JOIN skills s ON cs.skill_id = s.id
        WHERE cs.character_id = ?
        ORDER BY s.skill_type, s.name
      `, [characterId]);
      
      return skills;
    } catch (error) {
      console.error('캐릭터 스킬 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 캐릭터 정보 업데이트
   */
  static async update(
    id: number, 
    updates: Partial<Pick<Character, 'name' | 'health' | 'mana' | 'experience'>>
  ): Promise<ApiResponse<Character>> {
    try {
      const db = await getDatabase();
      
      const fields: string[] = [];
      const values: any[] = [];
      
      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      
      if (updates.health !== undefined) {
        fields.push('health = ?');
        values.push(updates.health);
      }
      
      if (updates.mana !== undefined) {
        fields.push('mana = ?');
        values.push(updates.mana);
      }
      
      if (updates.experience !== undefined) {
        fields.push('experience = ?');
        values.push(updates.experience);
      }
      
      if (fields.length === 0) {
        return {
          success: false,
          message: '업데이트할 필드가 없습니다.'
        };
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE characters SET ${fields.join(', ')} WHERE id = ?`;
      const result = await db.run(query, values);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '캐릭터를 찾을 수 없습니다.'
        };
      }
      
      // 레벨업 체크
      if (updates.experience !== undefined) {
        await this.checkLevelUp(id);
      }
      
      const updatedCharacter = await this.findById(id);
      
      return {
        success: true,
        data: updatedCharacter!,
        message: '캐릭터가 성공적으로 업데이트되었습니다.'
      };
      
    } catch (error) {
      console.error('캐릭터 업데이트 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 레벨업 체크 및 처리
   */
  private static async checkLevelUp(characterId: number): Promise<void> {
    try {
      const db = await getDatabase();
      
      const character = await db.get(
        'SELECT level, experience FROM characters WHERE id = ?',
        [characterId]
      );
      
      if (!character) return;
      
      // 레벨업 경험치 계산 (레벨 * 100)
      const requiredExp = character.level * 100;
      
      if (character.experience >= requiredExp) {
        const newLevel = character.level + 1;
        const remainingExp = character.experience - requiredExp;
        
        // 레벨업 시 스탯 증가
        const statIncrease = {
          maxHealth: 20,
          maxMana: 10,
          strength: 2,
          defense: 1,
          speed: 1
        };
        
        await db.run(`
          UPDATE characters SET 
            level = ?,
            experience = ?,
            max_health = max_health + ?,
            max_mana = max_mana + ?,
            strength = strength + ?,
            defense = defense + ?,
            speed = speed + ?,
            health = max_health + ?, -- 체력 완전 회복
            mana = max_mana + ?      -- 마나 완전 회복
          WHERE id = ?
        `, [
          newLevel, remainingExp,
          statIncrease.maxHealth, statIncrease.maxMana,
          statIncrease.strength, statIncrease.defense, statIncrease.speed,
          statIncrease.maxHealth, statIncrease.maxMana,
          characterId
        ]);
        
        console.log(`캐릭터 ${characterId} 레벨업: ${character.level} -> ${newLevel}`);
      }
      
    } catch (error) {
      console.error('레벨업 처리 오류:', error);
    }
  }
  
  /**
   * 캐릭터 삭제
   */
  static async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const db = await getDatabase();
      
      // 캐릭터가 진행 중인 배틀이 있는지 확인
      const activeBattle = await db.get(`
        SELECT id FROM battles 
        WHERE (player1_id = ? OR player2_id = ?) AND status = 'in_progress'
      `, [id, id]);
      
      if (activeBattle) {
        return {
          success: false,
          message: '진행 중인 배틀이 있는 캐릭터는 삭제할 수 없습니다.'
        };
      }
      
      const result = await db.run('DELETE FROM characters WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '캐릭터를 찾을 수 없습니다.'
        };
      }
      
      return {
        success: true,
        message: '캐릭터가 성공적으로 삭제되었습니다.'
      };
      
    } catch (error) {
      console.error('캐릭터 삭제 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 캐릭터에 스킬 추가
   */
  static async addSkill(characterId: number, skillId: number): Promise<ApiResponse<void>> {
    try {
      const db = await getDatabase();
      
      // 이미 보유한 스킬인지 확인
      const existingSkill = await db.get(
        'SELECT id FROM character_skills WHERE character_id = ? AND skill_id = ?',
        [characterId, skillId]
      );
      
      if (existingSkill) {
        return {
          success: false,
          message: '이미 보유한 스킬입니다.'
        };
      }
      
      await db.run(`
        INSERT INTO character_skills (character_id, skill_id, level)
        VALUES (?, ?, 1)
      `, [characterId, skillId]);
      
      return {
        success: true,
        message: '스킬이 성공적으로 추가되었습니다.'
      };
      
    } catch (error) {
      console.error('스킬 추가 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 캐릭터 스킬 레벨업
   */
  static async upgradeSkill(characterId: number, skillId: number): Promise<ApiResponse<void>> {
    try {
      const db = await getDatabase();
      
      const result = await db.run(`
        UPDATE character_skills 
        SET level = level + 1 
        WHERE character_id = ? AND skill_id = ? AND level < 5
      `, [characterId, skillId]);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '스킬을 찾을 수 없거나 최대 레벨입니다.'
        };
      }
      
      return {
        success: true,
        message: '스킬이 성공적으로 업그레이드되었습니다.'
      };
      
    } catch (error) {
      console.error('스킬 업그레이드 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 캐릭터 체력/마나 회복
   */
  static async heal(id: number, healthAmount: number = 0, manaAmount: number = 0): Promise<ApiResponse<Character>> {
    try {
      const db = await getDatabase();
      
      const result = await db.run(`
        UPDATE characters SET 
          health = MIN(health + ?, max_health),
          mana = MIN(mana + ?, max_mana)
        WHERE id = ?
      `, [healthAmount, manaAmount, id]);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '캐릭터를 찾을 수 없습니다.'
        };
      }
      
      const updatedCharacter = await this.findById(id);
      
      return {
        success: true,
        data: updatedCharacter!,
        message: '캐릭터가 회복되었습니다.'
      };
      
    } catch (error) {
      console.error('캐릭터 회복 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 캐릭터 통계
   */
  static async getStats(): Promise<{
    totalCharacters: number;
    averageLevel: number;
    highestLevel: number;
    newCharactersToday: number;
  }> {
    try {
      const db = await getDatabase();
      
      const [totalResult, avgLevelResult, maxLevelResult, newTodayResult] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM characters'),
        db.get('SELECT AVG(level) as avg FROM characters'),
        db.get('SELECT MAX(level) as max FROM characters'),
        db.get(`
          SELECT COUNT(*) as count FROM characters 
          WHERE DATE(created_at) = DATE('now')
        `)
      ]);
      
      return {
        totalCharacters: totalResult.count || 0,
        averageLevel: Math.round(avgLevelResult.avg || 0),
        highestLevel: maxLevelResult.max || 0,
        newCharactersToday: newTodayResult.count || 0
      };
      
    } catch (error) {
      console.error('캐릭터 통계 조회 오류:', error);
      return {
        totalCharacters: 0,
        averageLevel: 0,
        highestLevel: 0,
        newCharactersToday: 0
      };
    }
  }
}