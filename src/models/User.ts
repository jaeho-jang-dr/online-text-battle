import bcrypt from 'bcrypt';
import { getDatabase } from '../config/database';
import { User, ApiResponse } from '../types';

export class UserModel {
  /**
   * 새 사용자 생성
   */
  static async create(username: string, email: string, password: string): Promise<ApiResponse<Omit<User, 'password'>>> {
    try {
      const db = await getDatabase();
      
      // 중복 검사
      const existingUser = await db.get(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
      
      if (existingUser) {
        return {
          success: false,
          message: '이미 존재하는 사용자명 또는 이메일입니다.'
        };
      }
      
      // 비밀번호 해시화
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // 사용자 생성
      const result = await db.run(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `, [username, email, passwordHash]);
      
      if (!result.lastID) {
        return {
          success: false,
          message: '사용자 생성에 실패했습니다.'
        };
      }
      
      // 생성된 사용자 정보 반환
      const newUser = await db.get(`
        SELECT id, username, email, created_at, updated_at, is_admin, is_active
        FROM users WHERE id = ?
      `, [result.lastID]);
      
      return {
        success: true,
        data: newUser,
        message: '사용자가 성공적으로 생성되었습니다.'
      };
      
    } catch (error) {
      console.error('사용자 생성 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 사용자 인증
   */
  static async authenticate(username: string, password: string): Promise<ApiResponse<Omit<User, 'password'>>> {
    try {
      const db = await getDatabase();
      
      // 사용자 조회
      const user = await db.get(`
        SELECT id, username, email, password_hash, created_at, updated_at, is_admin, is_active
        FROM users WHERE username = ? OR email = ?
      `, [username, username]);
      
      if (!user) {
        return {
          success: false,
          message: '존재하지 않는 사용자입니다.'
        };
      }
      
      if (!user.is_active) {
        return {
          success: false,
          message: '비활성화된 계정입니다.'
        };
      }
      
      // 비밀번호 확인
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          message: '잘못된 비밀번호입니다.'
        };
      }
      
      // 마지막 로그인 시간 업데이트
      await db.run(`
        UPDATE users SET last_login = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [user.id]);
      
      // 비밀번호 해시 제거 후 반환
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
        success: true,
        data: userWithoutPassword,
        message: '로그인 성공'
      };
      
    } catch (error) {
      console.error('사용자 인증 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * ID로 사용자 조회
   */
  static async findById(id: number): Promise<Omit<User, 'password'> | null> {
    try {
      const db = await getDatabase();
      
      const user = await db.get(`
        SELECT id, username, email, created_at, updated_at, last_login, is_admin, is_active
        FROM users WHERE id = ?
      `, [id]);
      
      return user || null;
    } catch (error) {
      console.error('사용자 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 사용자명으로 사용자 조회
   */
  static async findByUsername(username: string): Promise<Omit<User, 'password'> | null> {
    try {
      const db = await getDatabase();
      
      const user = await db.get(`
        SELECT id, username, email, created_at, updated_at, last_login, is_admin, is_active
        FROM users WHERE username = ?
      `, [username]);
      
      return user || null;
    } catch (error) {
      console.error('사용자 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 모든 사용자 목록 조회 (관리자용)
   */
  static async findAll(limit: number = 100, offset: number = 0): Promise<Omit<User, 'password'>[]> {
    try {
      const db = await getDatabase();
      
      const users = await db.all(`
        SELECT id, username, email, created_at, updated_at, last_login, is_admin, is_active
        FROM users
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      return users;
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 사용자 정보 업데이트
   */
  static async update(id: number, updates: Partial<Pick<User, 'username' | 'email' | 'is_active'>>): Promise<ApiResponse<Omit<User, 'password'>>> {
    try {
      const db = await getDatabase();
      
      // 업데이트할 필드와 값들을 동적으로 구성
      const fields: string[] = [];
      const values: any[] = [];
      
      if (updates.username !== undefined) {
        fields.push('username = ?');
        values.push(updates.username);
      }
      
      if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
      }
      
      if (updates.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.is_active);
      }
      
      if (fields.length === 0) {
        return {
          success: false,
          message: '업데이트할 필드가 없습니다.'
        };
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      
      const result = await db.run(query, values);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        };
      }
      
      // 업데이트된 사용자 정보 반환
      const updatedUser = await this.findById(id);
      
      return {
        success: true,
        data: updatedUser!,
        message: '사용자 정보가 성공적으로 업데이트되었습니다.'
      };
      
    } catch (error) {
      console.error('사용자 업데이트 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 비밀번호 변경
   */
  static async updatePassword(id: number, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const db = await getDatabase();
      
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      const result = await db.run(`
        UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [passwordHash, id]);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        };
      }
      
      return {
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다.'
      };
      
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 사용자 삭제 (소프트 삭제 - 비활성화)
   */
  static async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const db = await getDatabase();
      
      const result = await db.run(`
        UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]);
      
      if (result.changes === 0) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        };
      }
      
      return {
        success: true,
        message: '사용자가 성공적으로 삭제되었습니다.'
      };
      
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 사용자 통계
   */
  static async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    onlineUsers: number;
  }> {
    try {
      const db = await getDatabase();
      
      const [totalResult, activeResult, newTodayResult] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM users'),
        db.get('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE'),
        db.get(`
          SELECT COUNT(*) as count FROM users 
          WHERE DATE(created_at) = DATE('now')
        `)
      ]);
      
      return {
        totalUsers: totalResult.count || 0,
        activeUsers: activeResult.count || 0,
        newUsersToday: newTodayResult.count || 0,
        onlineUsers: 0 // 실시간 온라인 사용자는 소켓에서 관리
      };
      
    } catch (error) {
      console.error('사용자 통계 조회 오류:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        onlineUsers: 0
      };
    }
  }
}