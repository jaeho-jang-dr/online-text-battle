import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { getDatabase, updateEloRatings } from '../../../lib/database';

// Simple battle result logic - this could be enhanced with AI evaluation
function determineBattleWinner(text1: string, text2: string, player1Id: number, player2Id: number): number {
  // For now, use a simple scoring system
  const score1 = calculateTextScore(text1);
  const score2 = calculateTextScore(text2);
  
  if (score1 > score2) {
    return player1Id;
  } else if (score2 > score1) {
    return player2Id;
  } else {
    // Random winner in case of tie
    return Math.random() < 0.5 ? player1Id : player2Id;
  }
}

function calculateTextScore(text: string): number {
  let score = 0;
  
  // Length bonus (up to 50 chars gets bonus)
  score += Math.min(text.length, 50) * 0.5;
  
  // Creativity bonus for varied vocabulary
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  score += uniqueWords.size * 2;
  
  // Punctuation bonus
  const punctuation = text.match(/[!?.,;:]/g);
  if (punctuation) {
    score += Math.min(punctuation.length, 5) * 1.5;
  }
  
  // Exclamation bonus
  const exclamations = text.match(/!/g);
  if (exclamations) {
    score += exclamations.length * 2;
  }
  
  return score;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const { battle_id, battle_text } = req.body;

    if (!battle_id || !battle_text) {
      return res.status(400).json({ message: '배틀 ID와 텍스트를 입력해주세요.' });
    }

    if (battle_text.length > 100) {
      return res.status(400).json({ message: '텍스트는 100자를 초과할 수 없습니다.' });
    }

    const db = getDatabase();

    // Get battle
    const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battle_id);
    if (!battle) {
      return res.status(404).json({ message: '배틀을 찾을 수 없습니다.' });
    }

    // Check if user is part of this battle
    if (battle.player1_id !== decoded.userId && battle.player2_id !== decoded.userId) {
      return res.status(403).json({ message: '이 배틀에 참가할 권한이 없습니다.' });
    }

    // Check if battle is still active
    if (battle.status !== 'in_progress') {
      return res.status(400).json({ message: '활성화된 배틀이 아닙니다.' });
    }

    // Update battle text
    const isPlayer1 = battle.player1_id === decoded.userId;
    if (isPlayer1) {
      if (battle.player1_text) {
        return res.status(400).json({ message: '이미 텍스트를 제출했습니다.' });
      }
      db.prepare('UPDATE battles SET player1_text = ? WHERE id = ?').run(battle_text, battle_id);
    } else {
      if (battle.player2_text) {
        return res.status(400).json({ message: '이미 텍스트를 제출했습니다.' });
      }
      db.prepare('UPDATE battles SET player2_text = ? WHERE id = ?').run(battle_text, battle_id);
    }

    // Get updated battle
    const updatedBattle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battle_id);

    // Check if both players have submitted
    if (updatedBattle.player1_text && updatedBattle.player2_text) {
      // Determine winner
      const winnerId = determineBattleWinner(
        updatedBattle.player1_text,
        updatedBattle.player2_text,
        updatedBattle.player1_id,
        updatedBattle.player2_id
      );

      const loserId = winnerId === updatedBattle.player1_id ? updatedBattle.player2_id : updatedBattle.player1_id;

      // Update ELO ratings
      const eloChanges = updateEloRatings(winnerId, loserId);

      // Complete battle
      db.prepare(`
        UPDATE battles SET 
        winner_id = ?,
        player1_elo_after = ?,
        player2_elo_after = ?,
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        winnerId,
        winnerId === updatedBattle.player1_id ? eloChanges.winnerNewElo : eloChanges.loserNewElo,
        winnerId === updatedBattle.player2_id ? eloChanges.winnerNewElo : eloChanges.loserNewElo,
        battle_id
      );

      return res.status(200).json({ 
        message: '배틀이 완료되었습니다!',
        submitted: true,
        completed: true
      });
    }

    res.status(200).json({ 
      message: '텍스트가 제출되었습니다. 상대방을 기다리는 중...',
      submitted: true,
      completed: false
    });
  } catch (error) {
    console.error('Submit battle text error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}