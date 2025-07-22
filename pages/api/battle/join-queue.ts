import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../../lib/database';

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
    const { preferred_opponent = 'random' } = req.body;

    const db = getDatabase();

    // Get user data
    const user = db.prepare('SELECT id, elo_rating FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // Check if user has a character
    const character = db.prepare('SELECT id FROM characters WHERE user_id = ?').get(decoded.userId);
    if (!character) {
      return res.status(400).json({ message: '캐릭터를 먼저 생성해주세요.' });
    }

    // Check if user is already in queue
    const existingQueue = db.prepare('SELECT id FROM battle_queue WHERE user_id = ?').get(decoded.userId);
    if (existingQueue) {
      return res.status(400).json({ message: '이미 큐에 참가중입니다.' });
    }

    // Check if user is already in a battle
    const activeBattle = db.prepare('SELECT id FROM battles WHERE (player1_id = ? OR player2_id = ?) AND status IN (?, ?)').get(
      decoded.userId, decoded.userId, 'waiting', 'in_progress'
    );
    if (activeBattle) {
      return res.status(400).json({ message: '이미 진행중인 배틀이 있습니다.' });
    }

    // Try to find a match first
    let opponent = null;
    
    if (preferred_opponent === 'similar_rating') {
      // Find opponent with similar ELO (±100)
      opponent = db.prepare(`
        SELECT bq.user_id, bq.elo_rating 
        FROM battle_queue bq 
        WHERE bq.user_id != ? 
        AND ABS(bq.elo_rating - ?) <= 100 
        ORDER BY ABS(bq.elo_rating - ?) ASC 
        LIMIT 1
      `).get(decoded.userId, user.elo_rating, user.elo_rating);
    } else if (preferred_opponent === 'leaderboard') {
      // Find opponent with higher ELO
      opponent = db.prepare(`
        SELECT bq.user_id, bq.elo_rating 
        FROM battle_queue bq 
        WHERE bq.user_id != ? 
        AND bq.elo_rating > ? 
        ORDER BY bq.elo_rating DESC 
        LIMIT 1
      `).get(decoded.userId, user.elo_rating);
    } else {
      // Random match
      opponent = db.prepare(`
        SELECT bq.user_id, bq.elo_rating 
        FROM battle_queue bq 
        WHERE bq.user_id != ? 
        ORDER BY RANDOM() 
        LIMIT 1
      `).get(decoded.userId);
    }

    if (opponent) {
      // Create battle immediately
      const insertBattle = db.prepare(`
        INSERT INTO battles (player1_id, player2_id, player1_elo_before, player2_elo_before, status)
        VALUES (?, ?, ?, ?, 'in_progress')
      `);
      
      const battleResult = insertBattle.run(decoded.userId, opponent.user_id, user.elo_rating, opponent.elo_rating);
      
      // Remove both players from queue
      db.prepare('DELETE FROM battle_queue WHERE user_id IN (?, ?)').run(decoded.userId, opponent.user_id);
      
      // Update users as not waiting
      db.prepare('UPDATE users SET waiting_for_battle = FALSE WHERE id IN (?, ?)').run(decoded.userId, opponent.user_id);
      
      const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleResult.lastInsertRowid);
      
      return res.status(200).json({
        message: '배틀이 매칭되었습니다!',
        battle,
        matched: true
      });
    } else {
      // Add to queue
      db.prepare(`
        INSERT INTO battle_queue (user_id, elo_rating, preferred_opponent)
        VALUES (?, ?, ?)
      `).run(decoded.userId, user.elo_rating, preferred_opponent);
      
      // Update user as waiting
      db.prepare('UPDATE users SET waiting_for_battle = TRUE WHERE id = ?').run(decoded.userId);
      
      return res.status(200).json({
        message: '큐에 참가했습니다. 상대를 기다리는 중...',
        matched: false
      });
    }
  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}