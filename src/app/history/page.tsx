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
  const [selectedBattle, setSelectedBattle] = useState<Battle | null>(null);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
              {battles.map((battle, index) => (
                <div 
                  key={battle.id}
                  style={{ 
                    cursor: 'pointer',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={() => setSelectedBattle(battle)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                        <span style={{ 
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: battle.youWon ? '#4caf50' : '#f44336',
                          minWidth: '50px'
                        }}>
                          {battle.youWon ? '✓ 승리' : '✗ 패배'}
                        </span>
                        <span style={{ 
                          fontSize: '16px',
                          fontWeight: '500',
                          color: '#333'
                        }}>
                          {battle.isYourBattle ? battle.player1_character : battle.player2_character} 
                          <span style={{ color: '#666', margin: '0 8px' }}>vs</span>
                          {battle.isYourBattle ? battle.player2_character : battle.player1_character}
                          {battle.is_ai_battle && (
                            <span style={{ 
                              marginLeft: '8px',
                              padding: '2px 6px',
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'normal'
                            }}>AI</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#666' }}>
                        <span>{formatDate(battle.ended_at)}</span>
                        <span>
                          ELO: {battle.isYourBattle ? battle.player1_elo_before : battle.player2_elo_before}
                          <span style={{ 
                            margin: '0 5px',
                            color: battle.youWon ? '#4caf50' : '#f44336',
                            fontWeight: 'bold'
                          }}>
                            →
                          </span>
                          {battle.isYourBattle ? battle.player1_elo_after : battle.player2_elo_after}
                          <span style={{ 
                            marginLeft: '5px',
                            color: battle.youWon ? '#4caf50' : '#f44336'
                          }}>
                            ({battle.youWon ? '+' : ''}{battle.isYourBattle ? 
                              battle.player1_elo_after - battle.player1_elo_before :
                              battle.player2_elo_after - battle.player2_elo_before
                            })
                          </span>
                        </span>
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '14px',
                      color: '#999',
                      marginLeft: '20px'
                    }}>
                      클릭하여 상세보기 →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 판정 상세 팝업 */}
      {selectedBattle && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedBattle(null)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '20px' }}>
              배틀 상세 정보
              <button
                onClick={() => setSelectedBattle(null)}
                style={{
                  float: 'right',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ×
              </button>
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#666' }}>
                {formatDate(selectedBattle.ended_at)}
              </p>
              <h3 style={{ margin: '10px 0' }}>
                {selectedBattle.player1_character} vs {selectedBattle.player2_character}
              </h3>
              <p style={{ 
                fontSize: '18px',
                fontWeight: 'bold',
                color: selectedBattle.youWon ? '#4caf50' : '#ff6b6b'
              }}>
                {selectedBattle.youWon ? '승리' : '패배'}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4>배틀 대사</h4>
              <div style={{ 
                backgroundColor: '#f9f9f9',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '10px'
              }}>
                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {selectedBattle.player1_character} ({selectedBattle.player1_name}):
                </p>
                <p style={{ fontStyle: 'italic' }}>"{selectedBattle.player1_chat}"</p>
              </div>
              <div style={{ 
                backgroundColor: '#f9f9f9',
                padding: '15px',
                borderRadius: '4px'
              }}>
                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {selectedBattle.player2_character} ({selectedBattle.player2_name}):
                </p>
                <p style={{ fontStyle: 'italic' }}>"{selectedBattle.player2_chat}"</p>
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#e8f5e9',
              padding: '20px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <h4>판정 결과</h4>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-around',
                marginBottom: '15px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold' }}>{selectedBattle.player1_character}</p>
                  <p style={{ 
                    fontSize: '24px',
                    color: selectedBattle.player1_score > selectedBattle.player2_score ? '#4caf50' : '#666'
                  }}>
                    {selectedBattle.player1_score}점
                  </p>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '20px',
                  color: '#666'
                }}>
                  VS
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold' }}>{selectedBattle.player2_character}</p>
                  <p style={{ 
                    fontSize: '24px',
                    color: selectedBattle.player2_score > selectedBattle.player1_score ? '#4caf50' : '#666'
                  }}>
                    {selectedBattle.player2_score}점
                  </p>
                </div>
              </div>
              {selectedBattle.judgment_reason && (
                <div style={{ 
                  borderTop: '1px solid #ccc',
                  paddingTop: '15px',
                  marginTop: '15px'
                }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>판정 이유:</p>
                  <p style={{ fontStyle: 'italic', color: '#555' }}>
                    {selectedBattle.judgment_reason}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4>ELO 변화</h4>
              <p>
                {selectedBattle.player1_name}: {selectedBattle.player1_elo_before} → {selectedBattle.player1_elo_after}
                {' '}({selectedBattle.player1_elo_after - selectedBattle.player1_elo_before > 0 ? '+' : ''}{selectedBattle.player1_elo_after - selectedBattle.player1_elo_before})
              </p>
              <p>
                {selectedBattle.player2_name}: {selectedBattle.player2_elo_before} → {selectedBattle.player2_elo_after}
                {' '}({selectedBattle.player2_elo_after - selectedBattle.player2_elo_before > 0 ? '+' : ''}{selectedBattle.player2_elo_after - selectedBattle.player2_elo_before})
              </p>
            </div>

            <button
              onClick={() => setSelectedBattle(null)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}