import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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
    const user = db.prepare('SELECT id, username, email, elo_rating, games_played, wins, losses, is_online FROM users WHERE id = ?').get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
}