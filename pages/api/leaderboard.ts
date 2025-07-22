import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const db = getDatabase();

    // Get top players by ELO rating
    const leaderboard = db.prepare(`
      SELECT 
        id,
        username,
        elo_rating,
        games_played,
        wins,
        losses
      FROM users 
      WHERE games_played > 0
      ORDER BY elo_rating DESC, wins DESC
      LIMIT 20
    `).all();

    res.status(200).json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}