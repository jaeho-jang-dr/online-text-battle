import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ message: '사용자명은 3-20자 사이여야 합니다.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: '비밀번호는 최소 6자 이상이어야 합니다.' });
  }

  try {
    const db = getDatabase();

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ message: '이미 존재하는 사용자명 또는 이메일입니다.' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `);

    const result = insertUser.run(username, email, hashedPassword);
    const userId = result.lastInsertRowid;

    // Get created user
    const user = db.prepare('SELECT id, username, email, elo_rating, games_played, wins, losses FROM users WHERE id = ?').get(userId);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}