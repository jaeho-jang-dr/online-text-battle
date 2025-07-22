import { useState, useEffect } from 'react';
import styles from '../styles/BattleQueue.module.css';

interface BattleQueueProps {
  user: any;
  character: any;
  onBattleStart: (battle: any) => void;
  onCancel: () => void;
}

export default function BattleQueue({ user, character, onBattleStart, onCancel }: BattleQueueProps) {
  const [queueStatus, setQueueStatus] = useState<'joining' | 'waiting' | 'matched'>('joining');
  const [matchType, setMatchType] = useState<'random' | 'similar_rating' | 'leaderboard'>('random');
  const [queueTime, setQueueTime] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (queueStatus === 'waiting') {
      interval = setInterval(() => {
        setQueueTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [queueStatus]);

  useEffect(() => {
    // Poll for battle matches
    let pollInterval: NodeJS.Timeout;
    
    if (queueStatus === 'waiting') {
      pollInterval = setInterval(checkForMatch, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [queueStatus]);

  const joinQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/battle/join-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferred_opponent: matchType })
      });

      const data = await response.json();

      if (response.ok) {
        setQueueStatus('waiting');
        setQueueTime(0);
      } else {
        setError(data.message || '큐 참가에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    }
  };

  const leaveQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/battle/leave-queue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      onCancel();
    } catch (error) {
      console.error('Failed to leave queue:', error);
      onCancel();
    }
  };

  const checkForMatch = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/battle/check-match', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.battle) {
          setQueueStatus('matched');
          onBattleStart(data.battle);
        }
      }
    } catch (error) {
      console.error('Failed to check for match:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (queueStatus === 'joining') {
    return (
      <div className={styles.queueContainer}>
        <div className={styles.queueForm}>
          <h3>배틀 매치메이킹</h3>
          
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.matchTypeSection}>
            <h4>상대 선택 방식</h4>
            <div className={styles.matchTypeOptions}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="matchType"
                  value="random"
                  checked={matchType === 'random'}
                  onChange={(e) => setMatchType(e.target.value as any)}
                />
                <span>랜덤 매칭</span>
                <small>아무나 빠른 매칭</small>
              </label>

              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="matchType"
                  value="similar_rating"
                  checked={matchType === 'similar_rating'}
                  onChange={(e) => setMatchType(e.target.value as any)}
                />
                <span>실력 비슷한 상대</span>
                <small>ELO 점수가 비슷한 상대</small>
              </label>

              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="matchType"
                  value="leaderboard"
                  checked={matchType === 'leaderboard'}
                  onChange={(e) => setMatchType(e.target.value as any)}
                />
                <span>리더보드 상위자</span>
                <small>상위 랭커와 매칭</small>
              </label>
            </div>
          </div>

          <div className={styles.characterPreview}>
            <h4>내 캐릭터</h4>
            <div className={styles.characterCard}>
              <strong>{character.name}</strong>
              <p>"{character.battle_text}"</p>
            </div>
          </div>

          <div className={styles.actions}>
            <button onClick={joinQueue} className={styles.joinBtn}>
              배틀 큐 참가
            </button>
            <button onClick={onCancel} className={styles.cancelBtn}>
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.queueContainer}>
      <div className={styles.waitingArea}>
        <h3>배틀 상대를 찾는 중...</h3>
        
        <div className={styles.queueInfo}>
          <div className={styles.timer}>
            대기 시간: {formatTime(queueTime)}
          </div>
          
          <div className={styles.matchTypeInfo}>
            매칭 방식: {
              matchType === 'random' ? '랜덤 매칭' :
              matchType === 'similar_rating' ? '실력 비슷한 상대' :
              '리더보드 상위자'
            }
          </div>
        </div>

        <div className={styles.loadingAnimation}>
          <div className={styles.spinner}></div>
          <p>상대를 찾고 있습니다...</p>
        </div>

        <button onClick={leaveQueue} className={styles.leaveQueueBtn}>
          큐 나가기
        </button>
      </div>
    </div>
  );
}