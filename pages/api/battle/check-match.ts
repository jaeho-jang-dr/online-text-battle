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

    // Check if user has an active battle
    const battle = db.prepare(`
      SELECT * FROM battles 
      WHERE (player1_id = ? OR player2_id = ?) 
      AND status IN ('waiting', 'in_progress')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(decoded.userId, decoded.userId);

    if (battle) {
      return res.status(200).json({ battle });
    }

    res.status(200).json({ battle: null });
  } catch (error) {
    console.error('Check match error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}