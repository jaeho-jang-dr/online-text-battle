import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const user = await getUserFromRequest(cookieHeader || undefined);

    if (user) {
      const db = await getDb();
      await db.run('UPDATE users SET is_online = 0 WHERE id = ?', user.id);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.headers.set(
      'Set-Cookie',
      serialize('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
    );

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}