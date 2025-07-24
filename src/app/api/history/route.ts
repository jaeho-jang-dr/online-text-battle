import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const user = await getUserFromRequest(cookieHeader || undefined);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const db = await getDb();
    
    const battles = await db.all(`
      SELECT 
        b.id,
        b.player1_id,
        b.player2_id,
        b.player1_chat,
        b.player2_chat,
        b.winner_id,
        b.player1_elo_before,
        b.player1_elo_after,
        b.player2_elo_before,
        b.player2_elo_after,
        b.judgment_reason,
        b.player1_score,
        b.player2_score,
        b.ended_at,
        b.is_ai_battle,
        p1.username as player1_name,
        p2.username as player2_name,
        c1.name as player1_character,
        c2.name as player2_character
      FROM battles b
      JOIN users p1 ON b.player1_id = p1.id
      JOIN users p2 ON b.player2_id = p2.id
      JOIN characters c1 ON b.player1_character_id = c1.id
      JOIN characters c2 ON b.player2_character_id = c2.id
      WHERE b.player1_id = ? OR b.player2_id = ?
      ORDER BY b.ended_at DESC
      LIMIT 50
    `, [user.id, user.id]);

    return NextResponse.json({
      success: true,
      battles: battles.map(battle => ({
        ...battle,
        isYourBattle: battle.player1_id === user.id,
        youWon: battle.winner_id === user.id
      }))
    });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}