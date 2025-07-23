import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
let db: Database.Database;

export function getDatabase() {
  if (!db) {
    try {
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      initializeTables();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
  return db;
}

function initializeTables() {
  // Users table with ELO rating
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      elo_rating INTEGER DEFAULT 1200,
      games_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_admin BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      is_online BOOLEAN DEFAULT FALSE,
      waiting_for_battle BOOLEAN DEFAULT FALSE
    )
  `);

  // Characters table with battle text
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name VARCHAR(50) NOT NULL,
      battle_text TEXT CHECK(length(battle_text) <= 100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Battles table with ELO changes
  db.exec(`
    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      player1_text TEXT,
      player2_text TEXT,
      winner_id INTEGER,
      player1_elo_before INTEGER,
      player2_elo_before INTEGER,
      player1_elo_after INTEGER,
      player2_elo_after INTEGER,
      elo_change INTEGER,
      status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (player1_id) REFERENCES users(id),
      FOREIGN KEY (player2_id) REFERENCES users(id),
      FOREIGN KEY (winner_id) REFERENCES users(id)
    )
  `);

  // Battle queue for matchmaking
  db.exec(`
    CREATE TABLE IF NOT EXISTS battle_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      elo_rating INTEGER NOT NULL,
      preferred_opponent TEXT DEFAULT 'random' CHECK (preferred_opponent IN ('random', 'similar_rating', 'leaderboard')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_elo ON users(elo_rating DESC);
    CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);
    CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
    CREATE INDEX IF NOT EXISTS idx_battle_queue_elo ON battle_queue(elo_rating);
  `);

  console.log('✅ Database tables initialized');
}

// ELO calculation functions
export function calculateEloChange(playerRating: number, opponentRating: number, result: number): number {
  const K = 32; // K-factor
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  return Math.round(K * (result - expectedScore));
}

export function updateEloRatings(winnerId: number, loserId: number) {
  const db = getDatabase();
  
  const winner = db.prepare('SELECT elo_rating FROM users WHERE id = ?').get(winnerId) as any;
  const loser = db.prepare('SELECT elo_rating FROM users WHERE id = ?').get(loserId) as any;
  
  const winnerEloChange = calculateEloChange(winner.elo_rating, loser.elo_rating, 1);
  const loserEloChange = calculateEloChange(loser.elo_rating, winner.elo_rating, 0);
  
  const winnerNewElo = winner.elo_rating + winnerEloChange;
  const loserNewElo = loser.elo_rating + loserEloChange;
  
  // Update ratings
  db.prepare('UPDATE users SET elo_rating = ?, games_played = games_played + 1, wins = wins + 1 WHERE id = ?')
    .run(winnerNewElo, winnerId);
  
  db.prepare('UPDATE users SET elo_rating = ?, games_played = games_played + 1, losses = losses + 1 WHERE id = ?')
    .run(loserNewElo, loserId);
  
  return { winnerEloChange, loserEloChange, winnerNewElo, loserNewElo };
}