import { getDatabase, runTransaction, logSystemEvent } from '../config/database';
import { ApiResponse } from '../types';

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name?: string;
  battle_id?: number;
  channel_type: 'global' | 'battle' | 'private';
  recipient_id?: number;
  recipient_name?: string;
  message: string;
  created_at: Date;
  is_system?: boolean;
}

export class ChatModel {
  /**
   * 채팅 메시지 저장
   */
  static async saveMessage(
    senderId: number,
    message: string,
    channelType: 'global' | 'battle' | 'private' = 'global',
    battleId?: number,
    recipientId?: number
  ): Promise<ApiResponse<ChatMessage>> {
    try {
      return await runTransaction(async (db) => {
        // 메시지 길이 제한
        if (message.length > 500) {
          return {
            success: false,
            message: '메시지는 500자를 초과할 수 없습니다.'
          };
        }

        // 욕설 필터링 (간단한 예시)
        const filteredMessage = this.filterProfanity(message);

        // 메시지 저장
        const result = await db.run(`
          INSERT INTO chat_messages (sender_id, battle_id, channel_type, recipient_id, message)
          VALUES (?, ?, ?, ?, ?)
        `, [senderId, battleId || null, channelType, recipientId || null, filteredMessage]);

        if (!result.lastID) {
          return {
            success: false,
            message: '메시지 저장에 실패했습니다.'
          };
        }

        // 저장된 메시지 조회 (발신자 정보 포함)
        const savedMessage = await db.get(`
          SELECT cm.*, 
                 s.username as sender_name,
                 r.username as recipient_name
          FROM chat_messages cm
          LEFT JOIN users s ON cm.sender_id = s.id
          LEFT JOIN users r ON cm.recipient_id = r.id
          WHERE cm.id = ?
        `, [result.lastID]);

        return {
          success: true,
          data: savedMessage,
          message: '메시지가 성공적으로 전송되었습니다.'
        };
      });
    } catch (error) {
      console.error('채팅 메시지 저장 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 시스템 메시지 저장
   */
  static async saveSystemMessage(
    message: string,
    battleId?: number,
    channelType: 'global' | 'battle' = 'global'
  ): Promise<ApiResponse<ChatMessage>> {
    try {
      const db = await getDatabase();
      
      const result = await db.run(`
        INSERT INTO chat_messages (sender_id, battle_id, channel_type, message, is_system)
        VALUES (NULL, ?, ?, ?, 1)
      `, [battleId || null, channelType, message]);

      if (!result.lastID) {
        return {
          success: false,
          message: '시스템 메시지 저장에 실패했습니다.'
        };
      }

      const savedMessage = await db.get(`
        SELECT * FROM chat_messages WHERE id = ?
      `, [result.lastID]);

      return {
        success: true,
        data: savedMessage
      };
    } catch (error) {
      console.error('시스템 메시지 저장 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 전체 채팅 기록 조회
   */
  static async getGlobalMessages(limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      const db = await getDatabase();
      
      const messages = await db.all(`
        SELECT cm.*, 
               s.username as sender_name
        FROM chat_messages cm
        LEFT JOIN users s ON cm.sender_id = s.id
        WHERE cm.channel_type = 'global'
        ORDER BY cm.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      return messages.reverse(); // 시간순으로 정렬
    } catch (error) {
      console.error('전체 채팅 조회 오류:', error);
      return [];
    }
  }

  /**
   * 배틀 채팅 기록 조회
   */
  static async getBattleMessages(battleId: number, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const db = await getDatabase();
      
      const messages = await db.all(`
        SELECT cm.*, 
               s.username as sender_name
        FROM chat_messages cm
        LEFT JOIN users s ON cm.sender_id = s.id
        WHERE cm.battle_id = ? AND cm.channel_type = 'battle'
        ORDER BY cm.created_at ASC
        LIMIT ?
      `, [battleId, limit]);

      return messages;
    } catch (error) {
      console.error('배틀 채팅 조회 오류:', error);
      return [];
    }
  }

  /**
   * 개인 메시지 기록 조회
   */
  static async getPrivateMessages(
    userId1: number, 
    userId2: number, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ChatMessage[]> {
    try {
      const db = await getDatabase();
      
      const messages = await db.all(`
        SELECT cm.*, 
               s.username as sender_name,
               r.username as recipient_name
        FROM chat_messages cm
        LEFT JOIN users s ON cm.sender_id = s.id
        LEFT JOIN users r ON cm.recipient_id = r.id
        WHERE cm.channel_type = 'private'
        AND ((cm.sender_id = ? AND cm.recipient_id = ?) 
             OR (cm.sender_id = ? AND cm.recipient_id = ?))
        ORDER BY cm.created_at ASC
        LIMIT ? OFFSET ?
      `, [userId1, userId2, userId2, userId1, limit, offset]);

      return messages;
    } catch (error) {
      console.error('개인 메시지 조회 오류:', error);
      return [];
    }
  }

  /**
   * 욕설 필터링
   */
  private static filterProfanity(message: string): string {
    // 간단한 욕설 필터링 예시
    const profanityWords = ['욕설1', '욕설2', '바보', '멍청이'];
    let filteredMessage = message;
    
    profanityWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filteredMessage = filteredMessage.replace(regex, '*'.repeat(word.length));
    });

    return filteredMessage;
  }

  /**
   * 사용자의 채팅 통계
   */
  static async getUserChatStats(userId: number): Promise<{
    totalMessages: number;
    globalMessages: number;
    battleMessages: number;
    privateMessages: number;
  }> {
    try {
      const db = await getDatabase();
      
      const [total, global, battle, privateMsg] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM chat_messages WHERE sender_id = ?', [userId]),
        db.get('SELECT COUNT(*) as count FROM chat_messages WHERE sender_id = ? AND channel_type = "global"', [userId]),
        db.get('SELECT COUNT(*) as count FROM chat_messages WHERE sender_id = ? AND channel_type = "battle"', [userId]),
        db.get('SELECT COUNT(*) as count FROM chat_messages WHERE sender_id = ? AND channel_type = "private"', [userId])
      ]);

      return {
        totalMessages: total?.count || 0,
        globalMessages: global?.count || 0,
        battleMessages: battle?.count || 0,
        privateMessages: privateMsg?.count || 0
      };
    } catch (error) {
      console.error('채팅 통계 조회 오류:', error);
      return {
        totalMessages: 0,
        globalMessages: 0,
        battleMessages: 0,
        privateMessages: 0
      };
    }
  }

  /**
   * 채팅 메시지 삭제 (관리자 전용)
   */
  static async deleteMessage(messageId: number): Promise<ApiResponse<void>> {
    try {
      const db = await getDatabase();
      
      const result = await db.run('DELETE FROM chat_messages WHERE id = ?', [messageId]);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '메시지를 찾을 수 없습니다.'
        };
      }

      return {
        success: true,
        message: '메시지가 삭제되었습니다.'
      };
    } catch (error) {
      console.error('채팅 메시지 삭제 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 전체 채팅 통계
   */
  static async getChatStats(): Promise<{
    totalMessages: number;
    todayMessages: number;
    globalMessages: number;
    battleMessages: number;
    privateMessages: number;
    activeUsers: number;
  }> {
    try {
      const db = await getDatabase();
      
      const [total, today, global, battle, privateMsg, activeUsers] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM chat_messages'),
        db.get(`
          SELECT COUNT(*) as count FROM chat_messages 
          WHERE DATE(created_at) = DATE('now')
        `),
        db.get('SELECT COUNT(*) as count FROM chat_messages WHERE channel_type = "global"'),
        db.get('SELECT COUNT(*) as count FROM chat_messages WHERE channel_type = "battle"'),
        db.get('SELECT COUNT(*) as count FROM chat_messages WHERE channel_type = "private"'),
        db.get(`
          SELECT COUNT(DISTINCT sender_id) as count FROM chat_messages 
          WHERE DATE(created_at) = DATE('now') AND sender_id IS NOT NULL
        `)
      ]);

      return {
        totalMessages: total?.count || 0,
        todayMessages: today?.count || 0,
        globalMessages: global?.count || 0,
        battleMessages: battle?.count || 0,
        privateMessages: privateMsg?.count || 0,
        activeUsers: activeUsers?.count || 0
      };
    } catch (error) {
      console.error('채팅 통계 조회 오류:', error);
      return {
        totalMessages: 0,
        todayMessages: 0,
        globalMessages: 0,
        battleMessages: 0,
        privateMessages: 0,
        activeUsers: 0
      };
    }
  }
}