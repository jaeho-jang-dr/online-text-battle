import { Router } from 'express';
import { CharacterModel } from '../models/Character';
import { authenticateToken } from '../middleware/auth';
import { logSystemEvent } from '../config/database';
import { ApiResponse, Character } from '../types';

const router = Router();

/**
 * 새 캐릭터 생성
 * POST /api/characters
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const { name, characterClass } = req.body;

    if (!name) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터 이름이 필요합니다.'
      };
      return res.status(400).json(response);
    }

    // 캐릭터 이름 검증
    if (name.length < 2 || name.length > 20) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터 이름은 2-20자여야 합니다.'
      };
      return res.status(400).json(response);
    }

    // 허용된 클래스 검증
    const validClasses = ['warrior', 'mage', 'archer'];
    const selectedClass = characterClass || 'warrior';
    
    if (!validClasses.includes(selectedClass)) {
      const response: ApiResponse = {
        success: false,
        message: '유효하지 않은 캐릭터 클래스입니다.'
      };
      return res.status(400).json(response);
    }

    const result = await CharacterModel.create(req.user.id, name, selectedClass);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `새 캐릭터 생성: ${name} (${selectedClass})`, {
        characterId: result.data!.id,
        characterClass: selectedClass
      }, req.user.id, req.ip);
    }

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('캐릭터 생성 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 현재 사용자의 캐릭터 목록 조회
 * GET /api/characters/my
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const characters = await CharacterModel.findByUserId(req.user.id);

    const response: ApiResponse<Character[]> = {
      success: true,
      data: characters
    };

    res.json(response);
  } catch (error) {
    console.error('캐릭터 목록 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 특정 캐릭터 조회
 * GET /api/characters/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    if (isNaN(characterId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 캐릭터 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const character = await CharacterModel.findById(characterId);
    
    if (!character) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Character> = {
      success: true,
      data: character
    };

    res.json(response);
  } catch (error) {
    console.error('캐릭터 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 캐릭터 정보 수정
 * PUT /api/characters/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const characterId = parseInt(req.params.id);
    if (isNaN(characterId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 캐릭터 ID입니다.'
      };
      return res.status(400).json(response);
    }

    // 캐릭터 소유권 확인
    const character = await CharacterModel.findById(characterId);
    if (!character) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    if (character.user_id !== req.user.id && !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '자신의 캐릭터만 수정할 수 있습니다.'
      };
      return res.status(403).json(response);
    }

    const { name, health, mana, experience } = req.body;
    const updates: any = {};

    if (name !== undefined) {
      if (name.length < 2 || name.length > 20) {
        const response: ApiResponse = {
          success: false,
          message: '캐릭터 이름은 2-20자여야 합니다.'
        };
        return res.status(400).json(response);
      }
      updates.name = name;
    }

    if (health !== undefined && req.user.is_admin) {
      updates.health = Math.max(0, Math.min(health, character.max_health));
    }

    if (mana !== undefined && req.user.is_admin) {
      updates.mana = Math.max(0, Math.min(mana, character.max_mana));
    }

    if (experience !== undefined && req.user.is_admin) {
      updates.experience = Math.max(0, experience);
    }

    const result = await CharacterModel.update(characterId, updates);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `캐릭터 수정: ${character.name}`, updates, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('캐릭터 수정 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 캐릭터 삭제
 * DELETE /api/characters/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const characterId = parseInt(req.params.id);
    if (isNaN(characterId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 캐릭터 ID입니다.'
      };
      return res.status(400).json(response);
    }

    // 캐릭터 소유권 확인
    const character = await CharacterModel.findById(characterId);
    if (!character) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    if (character.user_id !== req.user.id && !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '자신의 캐릭터만 삭제할 수 있습니다.'
      };
      return res.status(403).json(response);
    }

    const result = await CharacterModel.delete(characterId);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `캐릭터 삭제: ${character.name}`, undefined, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('캐릭터 삭제 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 캐릭터 스킬 조회
 * GET /api/characters/:id/skills
 */
router.get('/:id/skills', authenticateToken, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    if (isNaN(characterId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 캐릭터 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const skills = await CharacterModel.getCharacterSkills(characterId);

    const response: ApiResponse = {
      success: true,
      data: skills
    };

    res.json(response);
  } catch (error) {
    console.error('캐릭터 스킬 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 캐릭터에 스킬 추가
 * POST /api/characters/:id/skills
 */
router.post('/:id/skills', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const characterId = parseInt(req.params.id);
    if (isNaN(characterId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 캐릭터 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const { skillId } = req.body;

    if (!skillId) {
      const response: ApiResponse = {
        success: false,
        message: '스킬 ID가 필요합니다.'
      };
      return res.status(400).json(response);
    }

    // 캐릭터 소유권 확인
    const character = await CharacterModel.findById(characterId);
    if (!character) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    if (character.user_id !== req.user.id && !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '자신의 캐릭터에만 스킬을 추가할 수 있습니다.'
      };
      return res.status(403).json(response);
    }

    const result = await CharacterModel.addSkill(characterId, skillId);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `스킬 추가: ${character.name}`, {
        skillId
      }, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('스킬 추가 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 캐릭터 스킬 업그레이드
 * PUT /api/characters/:id/skills/:skillId/upgrade
 */
router.put('/:id/skills/:skillId/upgrade', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const characterId = parseInt(req.params.id);
    const skillId = parseInt(req.params.skillId);

    if (isNaN(characterId) || isNaN(skillId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 ID입니다.'
      };
      return res.status(400).json(response);
    }

    // 캐릭터 소유권 확인
    const character = await CharacterModel.findById(characterId);
    if (!character) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    if (character.user_id !== req.user.id && !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '자신의 캐릭터의 스킬만 업그레이드할 수 있습니다.'
      };
      return res.status(403).json(response);
    }

    const result = await CharacterModel.upgradeSkill(characterId, skillId);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `스킬 업그레이드: ${character.name}`, {
        skillId
      }, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('스킬 업그레이드 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 캐릭터 회복
 * POST /api/characters/:id/heal
 */
router.post('/:id/heal', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const characterId = parseInt(req.params.id);
    if (isNaN(characterId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 캐릭터 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const { healthAmount = 0, manaAmount = 0 } = req.body;

    // 캐릭터 소유권 확인 (또는 관리자)
    const character = await CharacterModel.findById(characterId);
    if (!character) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    if (character.user_id !== req.user.id && !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '자신의 캐릭터만 회복할 수 있습니다.'
      };
      return res.status(403).json(response);
    }

    const result = await CharacterModel.heal(characterId, healthAmount, manaAmount);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `캐릭터 회복: ${character.name}`, {
        healthAmount,
        manaAmount
      }, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('캐릭터 회복 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 캐릭터 통계 조회
 * GET /api/characters/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await CharacterModel.getStats();

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    console.error('캐릭터 통계 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

export default router;