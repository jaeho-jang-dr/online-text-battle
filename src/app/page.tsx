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
    </div>
  );
}