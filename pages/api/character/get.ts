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
    const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(decoded.userId);

    if (!character) {
      return res.status(404).json({ message: '캐릭터가 없습니다.' });
    }

    res.status(200).json({ character });
  } catch (error) {
    console.error('Get character error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}