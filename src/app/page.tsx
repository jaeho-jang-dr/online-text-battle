'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // URL 파라미터로 새 세션 여부 확인
    const urlParams = new URLSearchParams(window.location.search);
    const newSession = urlParams.get('new');
    
    if (!newSession) {
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/verify');
      if (res.ok) {
        router.push('/lobby');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/lobby');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('요청 실패. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const guestUsername = `Guest_${Math.random().toString(36).substring(2, 8)}`;
      const guestPassword = Math.random().toString(36).substring(2, 12);
      
      // 먼저 게스트 계정 생성
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: guestUsername, 
          password: guestPassword,
          isGuest: true 
        }),
      });

      const registerData = await registerRes.json();

      if (registerData.success) {
        // 바로 로그인
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: guestUsername, 
            password: guestPassword 
          }),
        });

        const loginData = await loginRes.json();
        
        if (loginData.success) {
          router.push('/lobby');
        } else {
          setError('게스트 로그인 실패');
        }
      } else {
        setError('게스트 계정 생성 실패');
      }
    } catch (error) {
      setError('게스트 로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>{isLogin ? '로그인' : '회원가입'}</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">사용자명</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? '처리중...' : (isLogin ? '로그인' : '회원가입')}
        </button>
      </form>

      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        {isLogin ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
        <button
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', color: '#007bff', padding: 0 }}
        >
          {isLogin ? '회원가입' : '로그인'}
        </button>
      </p>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <p style={{ marginBottom: '10px', color: '#666' }}>또는</p>
        <button
          onClick={handleGuestLogin}
          disabled={loading}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '12px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%'
          }}
        >
          {loading ? '처리중...' : '🎮 바로 플레이하기 (게스트)'}
        </button>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          회원가입 없이 바로 게임을 즐길 수 있습니다!
        </p>
      </div>
    </div>
  );
}