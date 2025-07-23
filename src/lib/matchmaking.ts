import { getDb } from './db';
import { Character, MatchmakingResult } from '@/types';

export async function findMatch(userId: number, characterId: number): Promise<MatchmakingResult> {
  const db = await getDb();

  try {
    // 1. 먼저 대기중인 실제 유저 찾기
    const waitingPlayer = await db.get(`
      SELECT 
        bq.id as queue_id,
        bq.user_id,
        bq.character_id,
        u.username,
        c.name as character_name,
        c.type as character_type,
        c.battle_chat
      FROM battle_queue bq
      JOIN users u ON bq.user_id = u.id
      JOIN characters c ON bq.character_id = c.id
      WHERE bq.status = 'waiting' 
        AND bq.user_id != ?
        AND u.is_online = 1
        AND NOT u.username LIKE 'AI_%'
      ORDER BY bq.joined_at ASC
      LIMIT 1
    `, userId);

    if (waitingPlayer) {
      // 대기중인 플레이어 발견 - 매칭 상태로 업데이트
      await db.run(
        'UPDATE battle_queue SET status = "matched" WHERE id = ?',
        waitingPlayer.queue_id
      );

      const character: Character = {
        id: waitingPlayer.character_id,
        user_id: waitingPlayer.user_id,
        name: waitingPlayer.character_name,
        type: waitingPlayer.character_type,
        battle_chat: waitingPlayer.battle_chat,
        is_active: true
      };

      return {
        success: true,
        opponent: {
          user_id: waitingPlayer.user_id,
          username: waitingPlayer.username,
          character,
          is_ai: false
        }
      };
    }

    // 2. 대기중인 플레이어가 없으면 자신을 대기열에 추가
    const queueResult = await db.run(
      'INSERT INTO battle_queue (user_id, character_id) VALUES (?, ?)',
      [userId, characterId]
    );

    // 3. AI 상대 중 랜덤으로 선택
    const aiOpponent = await db.get(`
      SELECT 
        u.id as user_id,
        u.username,
        c.id as character_id,
        c.name as character_name,
        c.type as character_type,
        c.battle_chat
      FROM users u
      JOIN characters c ON u.id = c.user_id
      WHERE u.username LIKE 'AI_%'
        AND c.is_active = 1
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (aiOpponent) {
      const character: Character = {
        id: aiOpponent.character_id,
        user_id: aiOpponent.user_id,
        name: aiOpponent.character_name,
        type: aiOpponent.character_type,
        battle_chat: aiOpponent.battle_chat,
        is_active: true
      };

      return {
        success: true,
        opponent: {
          user_id: aiOpponent.user_id,
          username: aiOpponent.username,
          character,
          is_ai: true
        },
        queue_id: queueResult.lastID
      };
    }

    return {
      success: false
    };
  } catch (error) {
    console.error('Matchmaking error:', error);
    return { success: false };
  }
}

export async function directChallenge(userId: number, characterId: number, targetUserId: number): Promise<MatchmakingResult> {
  const db = await getDb();

  try {
    // 대상 유저와 캐릭터 정보 가져오기
    const targetPlayer = await db.get(`
      SELECT 
        u.id as user_id,
        u.username,
        u.is_online,
        c.id as character_id,
        c.name as character_name,
        c.type as character_type,
        c.battle_chat
      FROM users u
      JOIN characters c ON u.id = c.user_id AND c.is_active = 1
      WHERE u.id = ?
    `, targetUserId);

    if (!targetPlayer) {
      return { success: false };
    }

    // AI이거나 온라인인 경우만 매칭 가능
    if (!targetPlayer.username.startsWith('AI_') && !targetPlayer.is_online) {
      return { success: false };
    }

    const character: Character = {
      id: targetPlayer.character_id,
      user_id: targetPlayer.user_id,
      name: targetPlayer.character_name,
      type: targetPlayer.character_type,
      battle_chat: targetPlayer.battle_chat,
      is_active: true
    };

    return {
      success: true,
      opponent: {
        user_id: targetPlayer.user_id,
        username: targetPlayer.username,
        character,
        is_ai: targetPlayer.username.startsWith('AI_')
      }
    };
  } catch (error) {
    console.error('Direct challenge error:', error);
    return { success: false };
  }
}