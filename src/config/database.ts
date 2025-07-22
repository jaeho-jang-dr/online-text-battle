import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function initializeDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) {
    return db;
  }

  try {
    const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'database.sqlite');
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('🗄️  SQLite 데이터베이스 연결 성공');

    // 데이터베이스 테이블 생성
    await createTables();

    return db;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  if (!db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

  try {
    // Users 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_admin BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // Characters 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(50) NOT NULL,
        level INTEGER DEFAULT 1,
        health INTEGER DEFAULT 100,
        max_health INTEGER DEFAULT 100,
        mana INTEGER DEFAULT 50,
        max_mana INTEGER DEFAULT 50,
        strength INTEGER DEFAULT 10,
        defense INTEGER DEFAULT 8,
        speed INTEGER DEFAULT 10,
        experience INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Skills 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        mana_cost INTEGER DEFAULT 0,
        damage INTEGER DEFAULT 0,
        heal_amount INTEGER DEFAULT 0,
        cooldown INTEGER DEFAULT 0,
        skill_type VARCHAR(20) DEFAULT 'attack',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Character_Skills 테이블 (캐릭터가 보유한 스킬)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS character_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        skill_id INTEGER NOT NULL,
        level INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
        FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE,
        UNIQUE(character_id, skill_id)
      )
    `);

    // Battles 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        winner_id INTEGER,
        status VARCHAR(20) DEFAULT 'waiting',
        turn_count INTEGER DEFAULT 0,
        current_turn INTEGER DEFAULT 1,
        battle_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        FOREIGN KEY (player1_id) REFERENCES characters (id),
        FOREIGN KEY (player2_id) REFERENCES characters (id),
        FOREIGN KEY (winner_id) REFERENCES characters (id)
      )
    `);

    // Battle_Actions 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS battle_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        battle_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        action_type VARCHAR(20) NOT NULL,
        skill_id INTEGER,
        target_id INTEGER,
        damage INTEGER DEFAULT 0,
        heal_amount INTEGER DEFAULT 0,
        turn_number INTEGER NOT NULL,
        action_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (battle_id) REFERENCES battles (id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters (id),
        FOREIGN KEY (skill_id) REFERENCES skills (id),
        FOREIGN KEY (target_id) REFERENCES characters (id)
      )
    `);

    // Rankings 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS rankings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        points INTEGER DEFAULT 1000,
        rank INTEGER DEFAULT 0,
        season INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
      )
    `);

    // System_Logs 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        user_id INTEGER,
        ip_address VARCHAR(45),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Game_Settings 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS game_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key VARCHAR(50) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 채팅 메시지 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        battle_id INTEGER,
        channel_type TEXT NOT NULL DEFAULT 'global',
        recipient_id INTEGER,
        message TEXT NOT NULL,
        is_system BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // 리플레이 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS replays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        battle_id INTEGER UNIQUE NOT NULL,
        title TEXT,
        description TEXT,
        replay_data TEXT NOT NULL,
        duration INTEGER NOT NULL,
        winner_id INTEGER,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        total_turns INTEGER NOT NULL,
        view_count INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_id) REFERENCES characters(id) ON DELETE SET NULL,
        FOREIGN KEY (player1_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (player2_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `);

    // 랭킹 히스토리 테이블
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ranking_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        points INTEGER NOT NULL,
        wins INTEGER NOT NULL,
        losses INTEGER NOT NULL,
        draws INTEGER NOT NULL,
        snapshot_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        UNIQUE(character_id, snapshot_date)
      )
    `);

    // 인덱스 생성
    await createIndexes();

    // 기본 데이터 삽입
    await insertDefaultData();

    console.log('📋 데이터베이스 테이블 생성 완료');
  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error);
    throw error;
  }
}

async function createIndexes(): Promise<void> {
  if (!db) return;

  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
      CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
      CREATE INDEX IF NOT EXISTS idx_battles_players ON battles(player1_id, player2_id);
      CREATE INDEX IF NOT EXISTS idx_battle_actions_battle_id ON battle_actions(battle_id);
      CREATE INDEX IF NOT EXISTS idx_rankings_points ON rankings(points DESC);
      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
      CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
    `);

    console.log('🔍 데이터베이스 인덱스 생성 완료');
  } catch (error) {
    console.error('❌ 인덱스 생성 실패:', error);
  }
}

async function insertDefaultData(): Promise<void> {
  if (!db) return;

  try {
    // 기본 스킬 데이터 확인 및 삽입
    const skillCount = await db.get('SELECT COUNT(*) as count FROM skills');
    
    if (skillCount.count === 0) {
      await db.exec(`
        INSERT INTO skills (name, description, mana_cost, damage, heal_amount, cooldown, skill_type) VALUES
        ('기본 공격', '기본적인 물리 공격입니다.', 0, 15, 0, 0, 'attack'),
        ('강타', '적에게 강력한 물리 공격을 가합니다.', 10, 25, 0, 2, 'attack'),
        ('치유', '체력을 회복합니다.', 15, 0, 30, 3, 'heal'),
        ('방어 태세', '다음 턴까지 받는 데미지를 50% 감소시킵니다.', 5, 0, 0, 2, 'defense'),
        ('파이어볼', '마법 화염구를 발사합니다.', 20, 30, 0, 3, 'attack'),
        ('아이스 스피어', '얼음 창을 발사하여 적을 공격합니다.', 18, 28, 0, 3, 'attack'),
        ('라이트닝 볼트', '번개를 소환하여 적을 공격합니다.', 22, 32, 0, 4, 'attack'),
        ('힐링 포션', '강력한 치유 마법을 사용합니다.', 25, 0, 50, 4, 'heal'),
        ('매직 쉴드', '마법 방어막을 생성합니다.', 12, 0, 0, 3, 'defense'),
        ('버서커 모드', '공격력을 2턴간 50% 증가시킵니다.', 15, 0, 0, 5, 'buff');
      `);
      console.log('⚔️  기본 스킬 데이터 삽입 완료');
    }

    // 기본 게임 설정 확인 및 삽입
    const settingCount = await db.get('SELECT COUNT(*) as count FROM game_settings');
    
    if (settingCount.count === 0) {
      await db.exec(`
        INSERT INTO game_settings (setting_key, setting_value, description) VALUES
        ('MAX_HEALTH', '100', '캐릭터 최대 체력'),
        ('MAX_MANA', '50', '캐릭터 최대 마나'),
        ('BASE_DAMAGE', '15', '기본 공격 데미지'),
        ('TURN_TIME_LIMIT', '30000', '턴 제한 시간 (밀리초)'),
        ('MAX_BATTLE_TIME', '300000', '최대 배틀 시간 (밀리초)'),
        ('STARTING_POINTS', '1000', '신규 캐릭터 시작 랭킹 점수'),
        ('MAINTENANCE_MODE', 'false', '점검 모드 활성화 여부'),
        ('MAX_CONCURRENT_BATTLES', '100', '최대 동시 배틀 수');
      `);
      console.log('⚙️  기본 게임 설정 삽입 완료');
    }

  } catch (error) {
    console.error('❌ 기본 데이터 삽입 실패:', error);
  }
}

export async function getDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!db) {
    throw new Error('데이터베이스가 초기화되지 않았습니다. initializeDatabase()를 먼저 호출하세요.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('🔒 데이터베이스 연결 종료');
  }
}

// 트랜잭션 헬퍼 함수
export async function runTransaction<T>(callback: (db: Database<sqlite3.Database, sqlite3.Statement>) => Promise<T>): Promise<T> {
  const database = await getDatabase();
  
  try {
    await database.exec('BEGIN TRANSACTION');
    const result = await callback(database);
    await database.exec('COMMIT');
    return result;
  } catch (error) {
    await database.exec('ROLLBACK');
    throw error;
  }
}

// 로그 기록 함수
export async function logSystemEvent(level: 'info' | 'warn' | 'error' | 'debug', message: string, details?: any, userId?: number, ipAddress?: string): Promise<void> {
  try {
    const database = await getDatabase();
    await database.run(`
      INSERT INTO system_logs (level, message, details, user_id, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `, [level, message, details ? JSON.stringify(details) : null, userId || null, ipAddress || null]);
  } catch (error) {
    console.error('시스템 로그 기록 실패:', error);
  }
}