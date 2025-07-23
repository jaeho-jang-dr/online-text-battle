import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import bcrypt from 'bcryptjs';

let db: Database | null = null;

export async function getDb() {
  if (!db) {
    // Vercel 환경에서는 메모리 DB 사용
    const filename = process.env.VERCEL ? ':memory:' : './database.sqlite';
    
    db = await open({
      filename,
      driver: sqlite3.Database
    });
    
    await initializeDb();
  }
  return db;
}

async function initializeDb() {
  const database = await getDb();
  
  // Users table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_online BOOLEAN DEFAULT 0,
      total_battles INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      elo_rating INTEGER DEFAULT 1200
    )
  `);
  
  // Characters table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('normal', 'legendary', 'fictional', 'historical')),
      battle_chat TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // Battle queue table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS battle_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'matched', 'cancelled')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    )
  `);
  
  // Battles table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER NOT NULL,
      player1_character_id INTEGER NOT NULL,
      player1_chat TEXT NOT NULL,
      player2_id INTEGER NOT NULL,
      player2_character_id INTEGER NOT NULL,
      player2_chat TEXT NOT NULL,
      winner_id INTEGER,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      player1_elo_before INTEGER,
      player1_elo_after INTEGER,
      player2_elo_before INTEGER,
      player2_elo_after INTEGER,
      is_ai_battle BOOLEAN DEFAULT 0,
      FOREIGN KEY (player1_id) REFERENCES users(id),
      FOREIGN KEY (player2_id) REFERENCES users(id),
      FOREIGN KEY (winner_id) REFERENCES users(id)
    )
  `);
  
  // Leaderboard view
  await database.exec(`
    CREATE VIEW IF NOT EXISTS leaderboard AS
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
    WHERE u.total_battles >= 5
    ORDER BY u.elo_rating DESC
  `);
  
  // Create AI opponents
  await createAIOpponents(database);
}

async function createAIOpponents(database: Database) {
  const aiOpponents = [
    {
      username: 'AI_Napoleon',
      character: { name: 'Napoleon Bonaparte', type: 'historical', chat: 'I shall conquer this battlefield as I conquered Europe!' }
    },
    {
      username: 'AI_Einstein',
      character: { name: 'Albert Einstein', type: 'historical', chat: 'E=mc², but in this battle, Victory = Strategy × Intelligence²' }
    },
    {
      username: 'AI_Sherlock',
      character: { name: 'Sherlock Holmes', type: 'fictional', chat: 'Elementary, my dear opponent. Your defeat is already deduced.' }
    },
    {
      username: 'AI_Cleopatra',
      character: { name: 'Cleopatra', type: 'legendary', chat: 'The Queen of Egypt shall not be defeated by mere mortals!' }
    },
    {
      username: 'AI_DaVinci',
      character: { name: 'Leonardo da Vinci', type: 'legendary', chat: 'My genius spans art and war. Prepare for a masterpiece of defeat!' }
    }
  ];
  
  for (const ai of aiOpponents) {
    const existingAI = await database.get('SELECT id FROM users WHERE username = ?', ai.username);
    
    if (!existingAI) {
      const hashedPassword = await bcrypt.hash('ai_password_' + Date.now(), 10);
      const result = await database.run(
        'INSERT INTO users (username, password, is_online, elo_rating) VALUES (?, ?, 1, ?)',
        [ai.username, hashedPassword, 1300 + Math.floor(Math.random() * 400)]
      );
      
      await database.run(
        'INSERT INTO characters (user_id, name, type, battle_chat) VALUES (?, ?, ?, ?)',
        [result.lastID, ai.character.name, ai.character.type, ai.character.chat]
      );
    }
  }
}