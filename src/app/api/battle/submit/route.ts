import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { processBattle } from '@/lib/battle';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const user = await getUserFromRequest(cookieHeader || undefined);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const {
      player1CharacterId,
      player1Chat,
      player2Id,
      player2CharacterId,
      player2Chat,
      isAiBattle
    } = await request.json();

    if (!player1Chat || player1Chat.length > 100) {
      return NextResponse.json(
        { success: false, message: '배틀 챗은 1-100자여야 합니다.' },
        { status: 400 }
      );
    }

    const result = await processBattle(
      user.id,
      player1CharacterId,
      player1Chat,
      player2Id,
      player2CharacterId,
      player2Chat,
      isAiBattle
    );

    const isWinner = result.winner === 'player1';
    const yourNewElo = result.player1_new_elo;
    const opponentNewElo = result.player2_new_elo;

    return NextResponse.json({
      success: true,
      winner: isWinner ? 'you' : 'opponent',
      yourNewElo,
      opponentNewElo,
      yourEloChange: yourNewElo - user.elo_rating,
      opponentEloChange: opponentNewElo - (isWinner ? 
        (yourNewElo - user.elo_rating) * -1 : 
        (yourNewElo - user.elo_rating) * -1)
    });
  } catch (error) {
    console.error('Battle submit error:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}