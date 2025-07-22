import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const { name, battle_text } = req.body;

    if (!name || !battle_text) {
      return res.status(400).json({ message: '캐릭터 이름과 배틀 텍스트를 입력해주세요.' });
    }

    if (name.length < 2 || name.length > 20) {
      return res.status(400).json({ message: '캐릭터 이름은 2-20자 사이여야 합니다.' });
    }

    if (battle_text.length < 10 || battle_text.length > 100) {
      return res.status(400).json({ message: '배틀 텍스트는 10-100자 사이여야 합니다.' });
    }

    const db = getDatabase();

    // Check if user already has a character
    const existingCharacter = db.prepare('SELECT id FROM characters WHERE user_id = ?').get(decoded.userId);
    if (existingCharacter) {
      return res.status(400).json({ message: '이미 캐릭터가 존재합니다.' });
    }

    // Create character
    const insertCharacter = db.prepare(`
      INSERT INTO characters (user_id, name, battle_text)
      VALUES (?, ?, ?)
    `);

    const result = insertCharacter.run(decoded.userId, name, battle_text);
    const characterId = result.lastInsertRowid;

    // Get created character
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);

    res.status(201).json({
      message: '캐릭터가 생성되었습니다.',
      character
    });
  } catch (error) {
    console.error('Character creation error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}