import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { findMatch, directChallenge } from '@/lib/matchmaking';

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

    const { characterId, challengeId } = await request.json();

    if (!characterId) {
      return NextResponse.json(
        { success: false, message: '캐릭터를 선택해주세요.' },
        { status: 400 }
      );
    }

    let result;
    
    if (challengeId) {
      // 특정 유저에게 도전
      result = await directChallenge(user.id, characterId, challengeId);
    } else {
      // 일반 매치메이킹
      result = await findMatch(user.id, characterId);
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, message: '매칭에 실패했습니다.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}