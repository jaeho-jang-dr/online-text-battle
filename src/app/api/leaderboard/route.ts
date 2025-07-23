import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    
    const leaderboard = await db.all(`
      SELECT 
        u.id,
        u.username,
        u.elo_rating,
        u.total_battles,
        u.wins,
        u.losses,
        u.is_online,
        c.id as active_character_id,
        c.name as character_name,
        c.type as character_type,
        CASE 
          WHEN u.total_battles > 0 THEN ROUND(CAST(u.wins AS FLOAT) / u.total_battles * 100, 2)
          ELSE 0
        END as win_rate
      FROM users u
      LEFT JOIN characters c ON u.id = c.user_id AND c.is_active = 1
      WHERE u.username NOT LIKE 'AI_%'
      ORDER BY u.elo_rating DESC
      LIMIT 50
    `);

    return NextResponse.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}