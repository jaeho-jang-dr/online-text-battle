import { Router } from 'express';
import { ReplayModel, Replay } from '../models/Replay';
import { authenticateToken } from '../middleware/auth';
import { logSystemEvent } from '../config/database';
import { ApiResponse } from '../types';

const router = Router();

/**
 * 리플레이 목록 조회
 * GET /api/replays
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const playerId = req.query.playerId ? parseInt(req.query.playerId as string) : undefined;
    const featured = req.query.featured === 'true';
    const search = req.query.search as string;

    const filters = {
      playerId,
      featured: featured ? true : undefined,
      search
    };

    const replays = await ReplayModel.findAll(limit, offset, filters);

    const response: ApiResponse<Replay[]> = {
      success: true,
      data: replays
    };

    res.json(response);
  } catch (error) {
    console.error('리플레이 목록 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 특정 리플레이 조회
 * GET /api/replays/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const replayId = parseInt(req.params.id);
    if (isNaN(replayId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 리플레이 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const replay = await ReplayModel.findById(replayId);
    
    if (!replay) {
      const response: ApiResponse = {
        success: false,
        message: '리플레이를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Replay> = {
      success: true,
      data: replay
    };

    res.json(response);
  } catch (error) {
    console.error('리플레이 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 리플레이 데이터 조회 (실제 재생용)
 * GET /api/replays/:id/data
 */
router.get('/:id/data', async (req, res) => {
  try {
    const replayId = parseInt(req.params.id);
    if (isNaN(replayId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 리플레이 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const replayData = await ReplayModel.getReplayData(replayId);
    
    if (!replayData) {
      const response: ApiResponse = {
        success: false,
        message: '리플레이 데이터를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: replayData
    };

    res.json(response);
  } catch (error) {
    console.error('리플레이 데이터 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 인기 리플레이 조회
 * GET /api/replays/popular/list
 */
router.get('/popular/list', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const replays = await ReplayModel.getPopularReplays(limit);

    const response: ApiResponse<Replay[]> = {
      success: true,
      data: replays
    };

    res.json(response);
  } catch (error) {
    console.error('인기 리플레이 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 추천 리플레이 조회
 * GET /api/replays/featured/list
 */
router.get('/featured/list', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
    const replays = await ReplayModel.getFeaturedReplays(limit);

    const response: ApiResponse<Replay[]> = {
      success: true,
      data: replays
    };

    res.json(response);
  } catch (error) {
    console.error('추천 리플레이 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 리플레이 수정 (관리자 및 소유자)
 * PUT /api/replays/:id
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

    const replayId = parseInt(req.params.id);
    if (isNaN(replayId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 리플레이 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const { title, description, is_featured } = req.body;

    // 관리자가 아닌 경우 추천 기능 수정 불가
    const updates: any = {
      title,
      description
    };

    if (req.user.is_admin && is_featured !== undefined) {
      updates.is_featured = is_featured;
    }

    const result = await ReplayModel.update(replayId, updates);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `리플레이 수정: ${replayId}`, updates, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('리플레이 수정 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 리플레이 삭제 (관리자 전용)
 * DELETE /api/replays/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '관리자 권한이 필요합니다.'
      };
      return res.status(403).json(response);
    }

    const replayId = parseInt(req.params.id);
    if (isNaN(replayId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 리플레이 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const result = await ReplayModel.delete(replayId);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('warn', `리플레이 삭제: ${replayId}`, undefined, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('리플레이 삭제 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 리플레이 통계 (관리자 전용)
 * GET /api/replays/admin/stats
 */
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '관리자 권한이 필요합니다.'
      };
      return res.status(403).json(response);
    }

    const stats = await ReplayModel.getStats();

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    console.error('리플레이 통계 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

export default router;