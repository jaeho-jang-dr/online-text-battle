import { useState, useEffect } from 'react';
import styles from '../styles/Leaderboard.module.css';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.leaderboard}>
        <h3>리더보드</h3>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.leaderboard}>
      <h3>리더보드</h3>
      <div className={styles.leaderboardList}>
        {leaderboard.length === 0 ? (
          <p className={styles.empty}>아직 랭킹 데이터가 없습니다.</p>
        ) : (
          leaderboard.map((player, index) => (
            <div key={player.id} className={styles.leaderboardItem}>
              <div className={styles.rank}>#{index + 1}</div>
              <div className={styles.playerInfo}>
                <div className={styles.username}>{player.username}</div>
                <div className={styles.stats}>
                  <span>ELO: {player.elo_rating}</span>
                  <span>승: {player.wins}</span>
                  <span>패: {player.losses}</span>
                  {player.games_played > 0 && (
                    <span>승률: {Math.round((player.wins / player.games_played) * 100)}%</span>
                  )}
                </div>
              </div>
              <div className={styles.badge}>
                {index === 0 && '👑'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}