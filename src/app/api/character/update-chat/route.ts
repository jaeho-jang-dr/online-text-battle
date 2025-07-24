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

    const body = await request.json();
    const { characterId, battle_chat } = body;

    if (!characterId || !battle_chat) {
      return NextResponse.json(
        { success: false, message: 'Character ID and battle chat are required' },
        { status: 400 }
      );
    }

    if (battle_chat.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Battle chat must be 100 characters or less' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 캐릭터가 해당 유저의 것인지 확인
    const character = await db.get(
      'SELECT * FROM characters WHERE id = ? AND user_id = ? AND is_active = 1',
      [characterId, user.id]
    );

    if (!character) {
      return NextResponse.json(
        { success: false, message: 'Character not found or unauthorized' },
        { status: 404 }
      );
    }

    // 배틀 챗 업데이트
    await db.run(
      'UPDATE characters SET battle_chat = ? WHERE id = ?',
      [battle_chat, characterId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Battle chat updated successfully' 
    });
  } catch (error) {
    console.error('Update battle chat error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}