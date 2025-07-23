import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

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

    const { name, type, battle_chat } = await request.json();

    if (!name || !type || !battle_chat) {
      return NextResponse.json(
        { success: false, message: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (battle_chat.length > 100) {
      return NextResponse.json(
        { success: false, message: '배틀 챗은 100자 이내여야 합니다.' },
        { status: 400 }
      );
    }

    const validTypes = ['normal', 'legendary', 'fictional', 'historical'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 캐릭터 유형입니다.' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 기존 캐릭터 비활성화
    await db.run(
      'UPDATE characters SET is_active = 0 WHERE user_id = ?',
      user.id
    );

    // 새 캐릭터 생성
    const result = await db.run(
      'INSERT INTO characters (user_id, name, type, battle_chat) VALUES (?, ?, ?, ?)',
      [user.id, name, type, battle_chat]
    );

    const character = await db.get(
      'SELECT * FROM characters WHERE id = ?',
      result.lastID
    );

    return NextResponse.json({
      success: true,
      message: '캐릭터가 생성되었습니다.',
      character
    });
  } catch (error) {
    console.error('Create character error:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}