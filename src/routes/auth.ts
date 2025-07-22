import { Router } from 'express';
import { UserModel } from '../models/User';
import { 
  generateToken, 
  authenticateToken, 
  refreshToken,
  validatePassword,
  validateEmail,
  validateUsername
} from '../middleware/auth';
import { logSystemEvent } from '../config/database';
import { ApiResponse, LoginRequest, RegisterRequest, AuthResponse } from '../types';

const router = Router();

/**
 * 사용자 등록
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password }: RegisterRequest = req.body;

    // 입력값 검증
    if (!username || !email || !password) {
      const response: ApiResponse = {
        success: false,
        message: '모든 필드를 입력해주세요.'
      };
      return res.status(400).json(response);
    }

    // 사용자명 검증
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      const response: ApiResponse = {
        success: false,
        message: usernameValidation.message
      };
      return res.status(400).json(response);
    }

    // 이메일 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      const response: ApiResponse = {
        success: false,
        message: emailValidation.message
      };
      return res.status(400).json(response);
    }

    // 비밀번호 검증
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      const response: ApiResponse = {
        success: false,
        message: passwordValidation.message
      };
      return res.status(400).json(response);
    }

    // 사용자 생성
    const result = await UserModel.create(username, email, password);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // 토큰 생성
    const token = generateToken(result.data!.id, result.data!.username, result.data!.is_admin);

    // 로그 기록
    await logSystemEvent('info', `새 사용자 등록: ${username}`, { email }, result.data!.id, req.ip);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        token,
        user: result.data!
      },
      message: '회원가입이 완료되었습니다.'
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('회원가입 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 사용자 로그인
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password }: LoginRequest = req.body;

    // 입력값 검증
    if (!username || !password) {
      const response: ApiResponse = {
        success: false,
        message: '사용자명과 비밀번호를 입력해주세요.'
      };
      return res.status(400).json(response);
    }

    // 사용자 인증
    const result = await UserModel.authenticate(username, password);

    if (!result.success) {
      // 실패한 로그인 시도 로그
      await logSystemEvent('warn', `로그인 실패: ${username}`, { reason: result.message }, undefined, req.ip);
      return res.status(401).json(result);
    }

    // 토큰 생성
    const token = generateToken(result.data!.id, result.data!.username, result.data!.is_admin);

    // 로그 기록
    await logSystemEvent('info', `사용자 로그인: ${result.data!.username}`, undefined, result.data!.id, req.ip);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        token,
        user: result.data!
      },
      message: '로그인 성공'
    };

    res.json(response);
  } catch (error) {
    console.error('로그인 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 토큰 검증 및 사용자 정보 조회
 * GET /api/auth/verify
 */
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    // 최신 사용자 정보 조회
    const user = await UserModel.findById(req.user.id);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: '토큰이 유효합니다.'
    };

    res.json(response);
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 토큰 갱신
 * POST /api/auth/refresh
 */
router.post('/refresh', refreshToken);

/**
 * 로그아웃
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // 로그 기록
    if (req.user) {
      await logSystemEvent('info', `사용자 로그아웃: ${req.user.username}`, undefined, req.user.id, req.ip);
    }

    const response: ApiResponse = {
      success: true,
      message: '로그아웃되었습니다.'
    };

    res.json(response);
  } catch (error) {
    console.error('로그아웃 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 비밀번호 변경
 * PUT /api/auth/password
 */
router.put('/password', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      const response: ApiResponse = {
        success: false,
        message: '현재 비밀번호와 새 비밀번호를 입력해주세요.'
      };
      return res.status(400).json(response);
    }

    // 새 비밀번호 검증
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      const response: ApiResponse = {
        success: false,
        message: passwordValidation.message
      };
      return res.status(400).json(response);
    }

    // 현재 비밀번호 확인
    const authResult = await UserModel.authenticate(req.user.username, currentPassword);
    if (!authResult.success) {
      const response: ApiResponse = {
        success: false,
        message: '현재 비밀번호가 올바르지 않습니다.'
      };
      return res.status(401).json(response);
    }

    // 비밀번호 변경
    const result = await UserModel.updatePassword(req.user.id, newPassword);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `비밀번호 변경: ${req.user.username}`, undefined, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 프로필 정보 조회
 * GET /api/auth/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const user = await UserModel.findById(req.user.id);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: user
    };

    res.json(response);
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 프로필 정보 수정
 * PUT /api/auth/profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const { username, email } = req.body;
    const updates: any = {};

    // 사용자명 업데이트
    if (username && username !== req.user.username) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          message: usernameValidation.message
        };
        return res.status(400).json(response);
      }
      updates.username = username;
    }

    // 이메일 업데이트
    if (email && email !== req.user.email) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          message: emailValidation.message
        };
        return res.status(400).json(response);
      }
      updates.email = email;
    }

    if (Object.keys(updates).length === 0) {
      const response: ApiResponse = {
        success: false,
        message: '변경할 정보가 없습니다.'
      };
      return res.status(400).json(response);
    }

    // 프로필 업데이트
    const result = await UserModel.update(req.user.id, updates);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `프로필 업데이트: ${req.user.username}`, updates, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

/**
 * 계정 삭제 (비활성화)
 * DELETE /api/auth/account
 */
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: '인증되지 않은 사용자입니다.'
      };
      return res.status(401).json(response);
    }

    const { password } = req.body;

    if (!password) {
      const response: ApiResponse = {
        success: false,
        message: '계정 삭제를 위해 비밀번호를 입력해주세요.'
      };
      return res.status(400).json(response);
    }

    // 비밀번호 확인
    const authResult = await UserModel.authenticate(req.user.username, password);
    if (!authResult.success) {
      const response: ApiResponse = {
        success: false,
        message: '비밀번호가 올바르지 않습니다.'
      };
      return res.status(401).json(response);
    }

    // 계정 비활성화
    const result = await UserModel.delete(req.user.id);

    if (result.success) {
      // 로그 기록
      await logSystemEvent('info', `계정 삭제: ${req.user.username}`, undefined, req.user.id, req.ip);
    }

    res.json(result);
  } catch (error) {
    console.error('계정 삭제 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '서버 오류가 발생했습니다.'
    };
    
    res.status(500).json(response);
  }
});

export default router;