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
    
    const db = getDatabase();

    // Remove from queue
    db.prepare('DELETE FROM battle_queue WHERE user_id = ?').run(decoded.userId);
    
    // Update user as not waiting
    db.prepare('UPDATE users SET waiting_for_battle = FALSE WHERE id = ?').run(decoded.userId);

    res.status(200).json({ message: '큐에서 나갔습니다.' });
  } catch (error) {
    console.error('Leave queue error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}