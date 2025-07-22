import { useState, useEffect } from 'react';
import styles from '../styles/BattleRoom.module.css';

interface BattleRoomProps {
  user: any;
  character: any;
  battleData: any;
  onBattleEnd: () => void;
}

export default function BattleRoom({ user, character, battleData, onBattleEnd }: BattleRoomProps) {
  const [battleText, setBattleText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [battleStatus, setBattleStatus] = useState<'preparing' | 'writing' | 'waiting' | 'completed'>('preparing');
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(60); // 60초 제한

  useEffect(() => {
    // Start battle after a short delay
    const timer = setTimeout(() => {
      setBattleStatus('writing');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (battleStatus === 'writing' && !submitted) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            submitBattleText();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [battleStatus, submitted]);

  useEffect(() => {
    // Poll for battle completion
    let pollInterval: NodeJS.Timeout;
    
    if (battleStatus === 'waiting') {
      pollInterval = setInterval(checkBattleResult, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [battleStatus]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 100) {
      setBattleText(value);
    }
  };

  const submitBattleText = async () => {
    if (submitted || !battleText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/battle/submit-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          battle_id: battleData.id,
          battle_text: battleText
        })
      });

      if (response.ok) {
        setSubmitted(true);
        setBattleStatus('waiting');
      }
    } catch (error) {
      console.error('Failed to submit battle text:', error);
    }
  };

  const checkBattleResult = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/battle/result/${battleData.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.battle.status === 'completed') {
          setResult(data.battle);
          setBattleStatus('completed');
        }
      }
    } catch (error) {
      console.error('Failed to check battle result:', error);
    }
  };

  const getOpponent = () => {
    return battleData.player1_id === user.id ? 
      { id: battleData.player2_id, name: 'Player 2' } : 
      { id: battleData.player1_id, name: 'Player 1' };
  };

  const isWinner = result && result.winner_id === user.id;

  if (battleStatus === 'preparing') {
    return (
      <div className={styles.battleRoom}>
        <div className={styles.preparing}>
          <h2>배틀 준비 중...</h2>
          <div className={styles.vs}>
            <div className={styles.player}>
              <h3>{character.name}</h3>
              <p>ELO: {user.elo_rating}</p>
            </div>
            <div className={styles.vsText}>VS</div>
            <div className={styles.player}>
              <h3>{getOpponent().name}</h3>
              <p>상대방</p>
            </div>
          </div>
          <p>잠시 후 배틀이 시작됩니다...</p>
        </div>
      </div>
    );
  }

  if (battleStatus === 'completed' && result) {
    return (
      <div className={styles.battleRoom}>
        <div className={styles.result}>
          <h2>{isWinner ? '승리!' : '패배...'}</h2>
          
          <div className={styles.battleTexts}>
            <div className={styles.playerText}>
              <h4>내 텍스트</h4>
              <p>"{battleText}"</p>
            </div>
            <div className={styles.opponentText}>
              <h4>상대 텍스트</h4>
              <p>"{user.id === result.player1_id ? result.player2_text : result.player1_text}"</p>
            </div>
          </div>

          <div className={styles.eloChange}>
            <h4>ELO 변화</h4>
            <p>
              {user.id === result.player1_id ? 
                `${result.player1_elo_before} → ${result.player1_elo_after} (${result.player1_elo_after - result.player1_elo_before > 0 ? '+' : ''}${result.player1_elo_after - result.player1_elo_before})` :
                `${result.player2_elo_before} → ${result.player2_elo_after} (${result.player2_elo_after - result.player2_elo_before > 0 ? '+' : ''}${result.player2_elo_after - result.player2_elo_before})`
              }
            </p>
          </div>

          <button onClick={onBattleEnd} className={styles.returnBtn}>
            로비로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.battleRoom}>
      <div className={styles.battleHeader}>
        <h2>배틀 진행 중</h2>
        <div className={styles.timer}>
          남은 시간: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {battleStatus === 'writing' && (
        <div className={styles.writingArea}>
          <h3>배틀 텍스트를 작성하세요!</h3>
          <textarea
            value={battleText}
            onChange={handleTextChange}
            placeholder="상대를 압도할 텍스트를 작성하세요... (최대 100자)"
            maxLength={100}
            className={styles.battleTextArea}
            disabled={submitted}
          />
          <div className={styles.textInfo}>
            <span>{battleText.length}/100</span>
            {!submitted && (
              <button 
                onClick={submitBattleText}
                disabled={!battleText.trim()}
                className={styles.submitBtn}
              >
                제출
              </button>
            )}
          </div>
        </div>
      )}

      {battleStatus === 'waiting' && (
        <div className={styles.waiting}>
          <h3>상대방의 응답을 기다리는 중...</h3>
          <div className={styles.submittedText}>
            <h4>제출한 텍스트</h4>
            <p>"{battleText}"</p>
          </div>
          <div className={styles.loadingAnimation}>
            <div className={styles.spinner}></div>
            <p>결과를 기다리고 있습니다...</p>
          </div>
        </div>
      )}
    </div>
  );
}