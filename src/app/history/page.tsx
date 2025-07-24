'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Battle {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_name: string;
  player2_name: string;
  player1_character: string;
  player2_character: string;
  player1_chat: string;
  player2_chat: string;
  winner_id: number;
  player1_elo_before: number;
  player1_elo_after: number;
  player2_elo_before: number;
  player2_elo_after: number;
  judgment_reason: string;
  player1_score: number;
  player2_score: number;
  ended_at: string;
  is_ai_battle: number;
  isYourBattle: boolean;
  youWon: boolean;
}

export default function History() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBattles, setExpandedBattles] = useState<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setBattles(data.battles);
      } else if (res.status === 401) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBattleDetails = (battleId: number) => {
    const newExpanded = new Set(expandedBattles);
    if (newExpanded.has(battleId)) {
      newExpanded.delete(battleId);
    } else {
      newExpanded.add(battleId);
    }
    setExpandedBattles(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return <div className="container">로딩 중...</div>;
  }

  return (
    <div>
      <nav className="nav">
        <div className="nav-content">
          <h1>배틀 히스토리</h1>
          <div className="nav-links">
            <button onClick={() => router.push('/lobby')}>로비로 돌아가기</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="card">
          <h2>최근 배틀 기록</h2>
          
          {battles.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
              아직 배틀 기록이 없습니다.
            </p>
          ) : (
            <div style={{ marginTop: '20px' }}>
              {battles.map((battle) => (
                <div 
                  key={battle.id} 
                  style={{ 
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 10px 0' }}>
                        {battle.player1_character} vs {battle.player2_character}
                      </h4>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        {battle.player1_name} vs {battle.player2_name} 
                        {battle.is_ai_battle ? ' (AI)' : ''}
                      </p>
                      <p style={{ 
                        margin: '5px 0', 
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: battle.youWon ? '#4caf50' : '#ff6b6b'
                      }}>
                        {battle.youWon ? '승리' : '패배'} 
                        <span style={{ fontWeight: 'normal', marginLeft: '10px' }}>
                          (ELO: {battle.isYourBattle ? 
                            `${battle.player1_elo_before} → ${battle.player1_elo_after}` :
                            `${battle.player2_elo_before} → ${battle.player2_elo_after}`
                          })
                        </span>
                      </p>
                      <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                        {formatDate(battle.ended_at)}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => toggleBattleDetails(battle.id)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {expandedBattles.has(battle.id) ? '상세 정보 숨기기' : '상세 정보 보기'}
                    </button>
                  </div>

                  {expandedBattles.has(battle.id) && (
                    <div style={{ 
                      marginTop: '20px', 
                      paddingTop: '20px', 
                      borderTop: '1px solid #e0e0e0' 
                    }}>
                      <div style={{ marginBottom: '15px' }}>
                        <h5>배틀 챗</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                              {battle.player1_character}:
                            </p>
                            <p style={{ 
                              fontStyle: 'italic', 
                              backgroundColor: '#fff',
                              padding: '10px',
                              borderRadius: '4px',
                              border: '1px solid #e0e0e0'
                            }}>
                              "{battle.player1_chat}"
                            </p>
                          </div>
                          <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                              {battle.player2_character}:
                            </p>
                            <p style={{ 
                              fontStyle: 'italic',
                              backgroundColor: '#fff',
                              padding: '10px',
                              borderRadius: '4px',
                              border: '1px solid #e0e0e0'
                            }}>
                              "{battle.player2_chat}"
                            </p>
                          </div>
                        </div>
                      </div>

                      <div style={{ 
                        backgroundColor: '#f0f0f0',
                        padding: '15px',
                        borderRadius: '4px'
                      }}>
                        <h5>판정 결과</h5>
                        <p>
                          점수: {battle.player1_character} ({battle.player1_score}점) vs {battle.player2_character} ({battle.player2_score}점)
                        </p>
                        {battle.judgment_reason && (
                          <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
                            판정 이유: {battle.judgment_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}