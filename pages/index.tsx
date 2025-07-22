import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthForm from '../components/AuthForm';
import GameLobby from '../components/GameLobby';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>온라인 텍스트 배틀</h1>
        {user && (
          <div className={styles.userInfo}>
            <span>{user.username} (ELO: {user.elo_rating})</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>로그아웃</button>
          </div>
        )}
      </header>

      <main className={styles.main}>
        {!user ? (
          <AuthForm onLogin={handleLogin} />
        ) : (
          <GameLobby user={user} />
        )}
      </main>
    </div>
  );
}