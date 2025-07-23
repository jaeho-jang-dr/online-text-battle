import { getDb } from './db';
import bcrypt from 'bcryptjs';

export async function seedTestUsers() {
  const db = await getDb();

  const testUsers = [
    {
      username: 'testuser1',
      password: 'test123',
      character: {
        name: '김철수',
        type: 'normal' as const,
        battle_chat: '평범한 직장인이지만 승부욕은 누구에게도 지지 않습니다!'
      }
    },
    {
      username: 'testuser2',
      password: 'test123',
      character: {
        name: '이영희',
        type: 'normal' as const,
        battle_chat: '대학생의 패기로 모든 도전을 받아들이겠어요!'
      }
    }
  ];

  console.log('Creating test users...');

  for (const testUser of testUsers) {
    try {
      // Check if user already exists
      const existing = await db.get('SELECT id FROM users WHERE username = ?', testUser.username);
      
      if (!existing) {
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        const result = await db.run(
          'INSERT INTO users (username, password, is_online, elo_rating, total_battles, wins, losses) VALUES (?, ?, 1, ?, ?, ?, ?)',
          [
            testUser.username, 
            hashedPassword, 
            1100 + Math.floor(Math.random() * 200),
            Math.floor(Math.random() * 20) + 5,
            Math.floor(Math.random() * 10) + 2,
            Math.floor(Math.random() * 10) + 2
          ]
        );
        
        await db.run(
          'INSERT INTO characters (user_id, name, type, battle_chat) VALUES (?, ?, ?, ?)',
          [result.lastID, testUser.character.name, testUser.character.type, testUser.character.battle_chat]
        );
        
        console.log(`Created test user: ${testUser.username}`);
      } else {
        console.log(`Test user already exists: ${testUser.username}`);
      }
    } catch (error) {
      console.error(`Error creating test user ${testUser.username}:`, error);
    }
  }

  // List all users
  const allUsers = await db.all('SELECT username, elo_rating, is_online FROM users ORDER BY elo_rating DESC');
  console.log('\nAll users in database:');
  allUsers.forEach(user => {
    console.log(`- ${user.username}: ELO ${user.elo_rating} (${user.is_online ? 'Online' : 'Offline'})`);
  });
}