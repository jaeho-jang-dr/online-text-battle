import { Router } from 'express';
import { ChatModel, ChatMessage } from '../models/Chat';
import { authenticateToken } from '../middleware/auth';
import { logSystemEvent } from '../config/database';
import { ApiResponse } from '../types';

const router = Router();

/**
 * 메시지 전송
 * POST /api/chat/send
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const { message, channelType = 'global', battleId, recipientId } = req.body;

    if (!message || message.trim().length === 0) {
      const response: ApiResponse = {
        success: false,
        message: '메시지 내용이 필요합니다.'
      };
      return res.status(400).json(response);
    }

    // 채널 타입 검증
    const validChannelTypes = ['global', 'battle', 'private'];
    if (!validChannelTypes.includes(channelType)) {
      const response: ApiResponse = {
        success: false,
        message: '유효하지 않은 채널 타입입니다.'
      };
      return res.status(400).json(response);
    }

    // 개인 메시지의 경우 수신자 ID 필수
    if (channelType === 'private' && !recipientId) {
      const response: ApiResponse = {
        success: false,
        message: '개인 메시지는 수신자 ID가 필요합니다.'
      };
      return res.status(400).json(response);
    }

    // 배틀 메시지의 경우 배틀 ID 필수
    if (channelType === 'battle' && !battleId) {
      const response: ApiResponse = {
        success: false,
        message: '배틀 메시지는 배틀 ID가 필요합니다.'
      };
      return res.status(400).json(response);
    }

    const result = await ChatModel.saveMessage(
      req.user.id,
      message.trim(),
      channelType,
      battleId,
      recipientId
    );

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `채팅 메시지 전송: ${channelType}`, {
        channelType,
        battleId,
        recipientId,
        messageLength: message.length
      }, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 전체 채팅 기록 조회
 * GET /api/chat/global
 */
router.get('/global', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // 제한값 검증
    const maxLimit = 100;
    const actualLimit = Math.min(limit, maxLimit);

    const messages = await ChatModel.getGlobalMessages(actualLimit, offset);

    const response: ApiResponse<ChatMessage[]> = {
      success: true,
      data: messages
    };

    res.json(response);
  } catch (error) {
    console.error('전체 채팅 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 배틀 채팅 기록 조회
 * GET /api/chat/battle/:battleId
 */
router.get('/battle/:battleId', authenticateToken, async (req, res) => {
  try {
    const battleId = parseInt(req.params.battleId);
    if (isNaN(battleId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 배틀 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const maxLimit = 100;
    const actualLimit = Math.min(limit, maxLimit);

    const messages = await ChatModel.getBattleMessages(battleId, actualLimit);

    const response: ApiResponse<ChatMessage[]> = {
      success: true,
      data: messages
    };

    res.json(response);
  } catch (error) {
    console.error('배틀 채팅 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 개인 메시지 기록 조회
 * GET /api/chat/private/:userId
 */
router.get('/private/:userId', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const otherUserId = parseInt(req.params.userId);
    if (isNaN(otherUserId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 사용자 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const maxLimit = 100;
    const actualLimit = Math.min(limit, maxLimit);

    const messages = await ChatModel.getPrivateMessages(
      req.user.id, 
      otherUserId, 
      actualLimit, 
      offset
    );

    const response: ApiResponse<ChatMessage[]> = {
      success: true,
      data: messages
    };

    res.json(response);
  } catch (error) {
    console.error('개인 메시지 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 사용자 채팅 통계
 * GET /api/chat/my/stats
 */
router.get('/my/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const stats = await ChatModel.getUserChatStats(req.user.id);

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    console.error('사용자 채팅 통계 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 메시지 삭제 (관리자 전용)
 * DELETE /api/chat/message/:messageId
 */
router.delete('/message/:messageId', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '관리자 권한이 필요합니다.'
      };
      return res.status(403).json(response);
    }

    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      const response: ApiResponse = {
        success: false,
        message: '잘못된 메시지 ID입니다.'
      };
      return res.status(400).json(response);
    }

    const result = await ChatModel.deleteMessage(messageId);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('warn', `채팅 메시지 삭제: ${messageId}`, undefined, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('메시지 삭제 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 채팅 통계 (관리자 전용)
 * GET /api/chat/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      const response: ApiResponse = {
        success: false,
        message: '관리자 권한이 필요합니다.'
      };
      return res.status(403).json(response);
    }

    const stats = await ChatModel.getChatStats();

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    console.error('채팅 통계 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

export default router;