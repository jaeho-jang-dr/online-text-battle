import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.substring(7);
  const { battleId } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    const db = getDatabase();

    // Get battle
    const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId);
    if (!battle) {
      return res.status(404).json({ message: '배틀을 찾을 수 없습니다.' });
    }

    // Check if user is part of this battle
    if (battle.player1_id !== decoded.userId && battle.player2_id !== decoded.userId) {
      return res.status(403).json({ message: '이 배틀에 접근할 권한이 없습니다.' });
    }

    res.status(200).json({ battle });
  } catch (error) {
    console.error('Get battle result error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}