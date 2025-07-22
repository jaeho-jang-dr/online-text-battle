import { Router } from 'express';
import { BattleModel } from '../models/Battle';
import { CharacterModel } from '../models/Character';
import { authenticateToken } from '../middleware/auth';
import { logSystemEvent } from '../config/database';
import { ApiResponse, Battle, BattleAction, ActionType } from '../types';

const router = Router();

/**
 * 새 배틀 생성
 * POST /api/battles
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

    const { player1Id, player2Id } = req.body;

    if (!player1Id || !player2Id) {
      const response: ApiResponse = {
        success: false,
        message: '플레이어 ID가 필요합니다.'
      };
      return res.status(400).json(response);
    }

    if (player1Id === player2Id) {
      const response: ApiResponse = {
        success: false,
        message: '자신과는 배틀할 수 없습니다.'
      };
      return res.status(400).json(response);
    }

    // 플레이어들이 존재하는지 확인
    const player1 = await CharacterModel.findById(player1Id);
    const player2 = await CharacterModel.findById(player2Id);

    if (!player1 || !player2) {
      const response: ApiResponse = {
        success: false,
        message: '존재하지 않는 캐릭터입니다.'
      };
      return res.status(404).json(response);
    }

    // 배틀 생성
    const result = await BattleModel.create(player1Id, player2Id);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `배틀 생성: ${player1.name} vs ${player2.name}`, {
        battleId: result.data!.id,
        player1Id,
        player2Id
      }, req.user.id, req.ip);
    }

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('배틀 생성 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 배틀 시작
 * PUT /api/battles/:id/start
 */
router.put('/:id/start', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const battleId = parseInt(req.params.id);
    if (isNaN(battleId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 배틀 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const result = await BattleModel.startBattle(battleId);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `배틀 시작: ${battleId}`, undefined, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('배틀 시작 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 배틀 정보 조회
 * GET /api/battles/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const battleId = parseInt(req.params.id);
    if (isNaN(battleId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 배틀 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const battle = await BattleModel.findById(battleId);
    
    if (!battle) {
      const response: ApiResponse = {
        success: false,
        message: '배틀을 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Battle> = {
      success: true,
      data: battle
    };

    res.json(response);
  } catch (error) {
    console.error('배틀 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 캐릭터의 활성 배틀 조회
 * GET /api/battles/character/:id/active
 */
router.get('/character/:id/active', authenticateToken, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    if (isNaN(characterId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 캐릭터 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const battle = await BattleModel.findActiveByCharacterId(characterId);
    
    const response: ApiResponse<Battle | null> = {
      success: true,
      data: battle
    };

    res.json(response);
  } catch (error) {
    console.error('활성 배틀 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 배틀 액션 수행
 * POST /api/battles/:id/action
 */
router.post('/:id/action', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const battleId = parseInt(req.params.id);
    if (isNaN(battleId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 배틀 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const { characterId, actionType, skillId, targetId } = req.body;

    if (!characterId || !actionType) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터 ID와 액션 타입이 필요합니다.'
      };
      return res.status(400).json(response);
    }

    // 액션 타입 검증
    const validActionTypes: ActionType[] = ['attack', 'skill', 'defend'];
    if (!validActionTypes.includes(actionType)) {
      const response: ApiResponse = {
        success: false,
        message: '유효하지 않은 액션 타입입니다.'
      };
      return res.status(400).json(response);
    }

    // 스킬 액션의 경우 스킬 ID 필수
    if (actionType === 'skill' && !skillId) {
      const response: ApiResponse = {
        success: false,
        message: '스킬 액션은 스킬 ID가 필요합니다.'
      };
      return res.status(400).json(response);
    }

    const result = await BattleModel.performAction(
      battleId,
      characterId,
      actionType,
      skillId,
      targetId
    );

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `배틀 액션: ${actionType}`, {
        battleId,
        characterId,
        actionType,
        skillId,
        targetId
      }, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('배틀 액션 수행 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 배틀 포기
 * POST /api/battles/:id/surrender
 */
router.post('/:id/surrender', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const battleId = parseInt(req.params.id);
    if (isNaN(battleId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 배틀 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const { characterId } = req.body;

    if (!characterId) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터 ID가 필요합니다.'
      };
      return res.status(400).json(response);
    }

    const result = await BattleModel.surrender(battleId, characterId);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `배틀 포기: ${battleId}`, {
        characterId
      }, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('배틀 포기 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 배틀 통계 조회
 * GET /api/battles/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await BattleModel.getStats();

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    console.error('배틀 통계 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

export default router;