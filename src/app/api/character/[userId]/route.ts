import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const user = await getUserFromRequest(cookieHeader || undefined);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { userId } = await params;
    const userIdNum = parseInt(userId);
    
    // 자신의 캐릭터만 조회 가능
    if (user.id !== userIdNum) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const db = await getDb();
    const character = await db.get(
      'SELECT * FROM characters WHERE user_id = ? AND is_active = 1',
      userIdNum
    );

    return NextResponse.json({ success: true, character });
  } catch (error) {
    console.error('Get character error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}