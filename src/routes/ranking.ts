import { Router } from 'express';
import { RankingModel, LeaderboardEntry, RankingStats } from '../models/Ranking';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = Router();

/**
 * 전체 리더보드 조회
 * GET /api/rankings/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const season = req.query.season as string;

    const leaderboard = await RankingModel.getLeaderboard(limit, offset, season);

    const response: ApiResponse<LeaderboardEntry[]> = {
      success: true,
      data: leaderboard
    };

    res.json(response);
  } catch (error) {
    console.error('리더보드 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 특정 캐릭터 랭킹 조회
 * GET /api/rankings/character/:characterId
 */
router.get('/character/:characterId', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    if (isNaN(characterId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 캐릭터 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const ranking = await RankingModel.getCharacterRanking(characterId);
    
    if (!ranking) {
      const response: ApiResponse = {
        success: false,
        message: '캐릭터 랭킹 정보를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<RankingStats> = {
      success: true,
      data: ranking
    };

    res.json(response);
  } catch (error) {
    console.error('캐릭터 랭킹 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 내 캐릭터 주변 랭킹 조회
 * GET /api/rankings/nearby/:characterId
 */
router.get('/nearby/:characterId', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    if (isNaN(characterId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 캐릭터 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const range = Math.min(parseInt(req.query.range as string) || 5, 20);
    const nearbyRankings = await RankingModel.getNearbyRankings(characterId, range);

    const response: ApiResponse<LeaderboardEntry[]> = {
      success: true,
      data: nearbyRankings
    };

    res.json(response);
  } catch (error) {
    console.error('주변 랭킹 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 레벨별 랭킹 조회
 * GET /api/rankings/level
 */
router.get('/level', async (req, res) => {
  try {
    const minLevel = Math.max(parseInt(req.query.minLevel as string) || 1, 1);
    const maxLevel = Math.min(parseInt(req.query.maxLevel as string) || 100, 100);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (minLevel > maxLevel) {
      const response: ApiResponse = {
        success: false,
        message: '최소 레벨이 최대 레벨보다 클 수 없습니다.'
      };
      return res.status(400).json(response);
    }

    const rankings = await RankingModel.getRankingsByLevel(minLevel, maxLevel, limit);

    const response: ApiResponse<LeaderboardEntry[]> = {
      success: true,
      data: rankings,
      message: `레벨 ${minLevel}-${maxLevel} 랭킹`
    };

    res.json(response);
  } catch (error) {
    console.error('레벨별 랭킹 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 주간 랭킹 조회
 * GET /api/rankings/weekly
 */
router.get('/weekly', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const weeklyRankings = await RankingModel.getWeeklyRankings(limit);

    const response: ApiResponse<LeaderboardEntry[]> = {
      success: true,
      data: weeklyRankings,
      message: '이번 주 랭킹'
    };

    res.json(response);
  } catch (error) {
    console.error('주간 랭킹 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 랭킹 통계
 * GET /api/rankings/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await RankingModel.getRankingStats();

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    console.error('랭킹 통계 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 내 랭킹 정보 (인증 필요)
 * GET /api/rankings/my
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

    // 사용자의 모든 캐릭터 랭킹 조회
    const db = await getDatabase();
    const userCharacters = await db.all(`
      SELECT c.id FROM characters c
      WHERE c.user_id = ?
    `, [req.user.id]);

    const myRankings: RankingStats[] = [];
    for (const char of userCharacters) {
      const ranking = await RankingModel.getCharacterRanking(char.id);
      if (ranking) {
        myRankings.push(ranking);
      }
    }

    const response: ApiResponse<RankingStats[]> = {
      success: true,
      data: myRankings
    };

    res.json(response);
  } catch (error) {
    console.error('내 랭킹 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 일일 랭킹 스냅샷 생성 (관리자 전용)
 * POST /api/rankings/admin/snapshot
 */
router.post('/admin/snapshot', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '관리자 권한이 필요합니다.'
      };
      return res.status(403).json(response);
    }

    await RankingModel.createDailySnapshot();

    const response: ApiResponse = {
      success: true,
      message: '일일 랭킹 스냅샷이 생성되었습니다.'
    };

    res.json(response);
  } catch (error) {
    console.error('랭킹 스냅샷 생성 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

// 데이터베이스 import 추가
import { getDatabase } from '../config/database';

export default router;