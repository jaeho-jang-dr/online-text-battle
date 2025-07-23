import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { parse } from 'cookie';
import { getDb } from './db';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function createUser(username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    const db = await getDb();
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', username);
    
    if (existingUser) {
      return { success: false, message: 'Username already exists' };
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    
    const user = await db.get<User>('SELECT id, username, elo_rating, total_battles, wins, losses, is_online FROM users WHERE id = ?', result.lastID);
    
    return { success: true, message: 'User created successfully', user };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, message: 'Failed to create user' };
  }
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean; message: string; user?: User; token?: string }> {
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);
    
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    await db.run(
      'UPDATE users SET is_online = 1, last_login = CURRENT_TIMESTAMP WHERE id = ?',
      user.id
    );
    
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    
    const { password: _, ...userWithoutPassword } = user;
    
    return { 
      success: true, 
      message: 'Login successful', 
      user: userWithoutPassword as User, 
      token 
    };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, message: 'Failed to login' };
  }
}

export async function verifyToken(token: string): Promise<{ valid: boolean; userId?: number }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return { valid: true, userId: decoded.userId };
  } catch (error) {
    return { valid: false };
  }
}

export async function getUserFromRequest(cookieHeader: string | undefined): Promise<User | null> {
  if (!cookieHeader) return null;
  
  const cookies = parse(cookieHeader);
  const token = cookies.token;
  
  if (!token) return null;
  
  const { valid, userId } = await verifyToken(token);
  if (!valid || !userId) return null;
  
  const db = await getDb();
  const user = await db.get<User>(
    'SELECT id, username, elo_rating, total_battles, wins, losses, is_online FROM users WHERE id = ?',
    userId
  );
  
  return user || null;
}