import { NextRequest, NextResponse } from 'next/server';
import { seedTestUsers } from '@/lib/seed-test-users';

export async function GET(request: NextRequest) {
  try {
    await seedTestUsers();
    return NextResponse.json({ success: true, message: 'Test users created' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to seed test users' },
      { status: 500 }
    );
  }
}