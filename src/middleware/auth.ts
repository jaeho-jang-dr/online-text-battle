import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import { JwtPayload, ApiResponse } from '../types';

// Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        is_admin: boolean;
      };
    }
  }
}

/**
 * JWT 토큰 생성
 */
export function generateToken(userId: number, username: string, isAdmin: boolean = false): string {
  const secret = process.env.JWT_SECRET || 'default-secret-key-for-development';

  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId,
    username
  };

  return (jwt as any).sign(
    payload,
    secret,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'online-text-battle'
    }
  );
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'default-secret-key-for-development';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    return null;
  }
}

/**
 * 인증 미들웨어
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: '접근 토큰이 필요합니다.'
      };
      res.status(401).json(response);
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const response: ApiResponse = {
        success: false,
        message: '유효하지 않은 토큰입니다.'
      };
      res.status(403).json(response);
      return;
    }

    // 사용자 정보 조회
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      };
      res.status(404).json(response);
      return;
    }

    if (!user.is_active) {
      const response: ApiResponse = {
        success: false,
        message: '비활성화된 계정입니다.'
      };
      res.status(403).json(response);
      return;
    }

    // 요청 객체에 사용자 정보 추가
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin
    };

    next();
  } catch (error) {
    console.error('인증 미들웨어 오류:', error);
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    res.status(500).json(response);
  }
}

/**
 * 관리자 권한 검사 미들웨어
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    const response: ApiResponse = {
      success: false,
      message: '인증이 필요합니다.'
    };
    res.status(401).json(response);
    return;
  }

  if (!req.user.is_admin) {
    const response: ApiResponse = {
      success: false,
      message: '관리자 권한이 필요합니다.'
    };
    res.status(403).json(response);
    return;
  }

  next();
}

/**
 * 옵셔널 인증 미들웨어 (토큰이 있으면 검증하고, 없어도 통과)
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const decoded = verifyToken(token);
    if (decoded) {
      const user = await UserModel.findById(decoded.userId);
      if (user && user.is_active) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: user.is_admin
        };
      }
    }

    next();
  } catch (error) {
    console.error('옵셔널 인증 미들웨어 오류:', error);
    next(); // 에러가 있어도 계속 진행
  }
}

/**
 * 토큰 갱신
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        message: '리프레시 토큰이 필요합니다.'
      };
      res.status(401).json(response);
      return;
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      const response: ApiResponse = {
        success: false,
        message: '유효하지 않은 리프레시 토큰입니다.'
      };
      res.status(403).json(response);
      return;
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.is_active) {
      const response: ApiResponse = {
        success: false,
        message: '사용자를 찾을 수 없거나 비활성화된 계정입니다.'
      };
      res.status(404).json(response);
      return;
    }

    // 새 토큰 생성
    const newToken = generateToken(user.id, user.username, user.is_admin);

    const response: ApiResponse = {
      success: true,
      data: {
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: user.is_admin
        }
      },
      message: '토큰이 갱신되었습니다.'
    };

    res.json(response);
  } catch (error) {
    console.error('토큰 갱신 오류:', error);
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    res.status(500).json(response);
  }
}

/**
 * 비밀번호 유효성 검사
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: '비밀번호는 최소 8자 이상이어야 합니다.'
    };
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: '비밀번호는 대문자, 소문자, 숫자를 각각 하나 이상 포함해야 합니다.'
    };
  }

  return { isValid: true };
}

/**
 * 이메일 유효성 검사
 */
export function validateEmail(email: string): { isValid: boolean; message?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    return {
      isValid: false,
      message: '유효한 이메일 주소를 입력해주세요.'
    };
  }

  return { isValid: true };
}

/**
 * 사용자명 유효성 검사
 */
export function validateUsername(username: string): { isValid: boolean; message?: string } {
  if (!username || username.length < 3 || username.length > 50) {
    return {
      isValid: false,
      message: '사용자명은 3자 이상 50자 이하여야 합니다.'
    };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      isValid: false,
      message: '사용자명은 영문자, 숫자, 언더스코어(_)만 사용할 수 있습니다.'
    };
  }

  return { isValid: true };
}