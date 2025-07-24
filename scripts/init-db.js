const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

console.log('🔧 Initializing database...');

// Create database directory if it doesn't exist
const dbDir = path.dirname('./database.sqlite');
if (!fs.existsSync(dbDir) && dbDir !== '.') {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      elo_rating INTEGER DEFAULT 1000,
      total_battles INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      attack_battles INTEGER DEFAULT 0,
      attack_wins INTEGER DEFAULT 0,
      defense_battles INTEGER DEFAULT 0,
      defense_wins INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Characters table
  db.run(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      chat TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Battles table
  db.run(`
    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER NOT NULL,
      player1_character_id INTEGER NOT NULL,
      player1_chat TEXT NOT NULL,
      player2_id INTEGER NOT NULL,
      player2_character_id INTEGER NOT NULL,
      player2_chat TEXT NOT NULL,
      winner_id INTEGER,
      player1_elo_before INTEGER,
      player1_elo_after INTEGER,
      player2_elo_before INTEGER,
      player2_elo_after INTEGER,
      is_ai_battle BOOLEAN DEFAULT 0,
      judgment_reason TEXT,
      player1_score INTEGER,
      player2_score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (player1_id) REFERENCES users (id),
      FOREIGN KEY (player2_id) REFERENCES users (id),
      FOREIGN KEY (winner_id) REFERENCES users (id)
    )
  `);

  console.log('✅ Database initialized successfully');
});

db.close();