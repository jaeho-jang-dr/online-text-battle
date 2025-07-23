'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Character, LeaderboardEntry } from '@/types';

export default function Lobby() {
  const [user, setUser] = useState<User | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [characterType, setCharacterType] = useState<'normal' | 'legendary' | 'fictional' | 'historical'>('normal');
  const [battleChat, setBattleChat] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchLeaderboard();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/verify');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        fetchCharacter(data.user.id);
      } else {
        router.push('/');
      }
    } catch (error) {
      router.push('/');
    }
  };

  const fetchCharacter = async (userId: number) => {
    try {
      const res = await fetch(`/api/character/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.character) {
          setCharacter(data.character);
        }
      }
    } catch (error) {
      console.error('Failed to fetch character:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/character/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: characterName,
          type: characterType,
          battle_chat: battleChat
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCharacter(data.character);
        setCharacterName('');
        setBattleChat('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('캐릭터 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBattle = async () => {
    if (!character) {
      setError('먼저 캐릭터를 생성해주세요.');
      return;
    }

    router.push('/battle');
  };

  const handleChallenge = async (opponentId: number) => {
    if (!character) {
      setError('먼저 캐릭터를 생성해주세요.');
      return;
    }

    router.push(`/battle?challenge=${opponentId}`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleNewLogin = () => {
    // 새 탭에서 로그인 페이지 열기
    window.open('/?new=true', '_blank');
  };

  return (
    <div>
      <nav className="nav">
        <div className="nav-content">
          <h1>Online Text Battle</h1>
          <div className="nav-links">
            <span>환영합니다, {user?.username}님!</span>
            <button onClick={handleNewLogin} style={{ marginRight: '10px' }}>
              다른 계정으로 로그인
            </button>
            <button onClick={handleLogout}>로그아웃</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="grid">
          <div className="card">
            <h2>내 정보</h2>
            <p>ELO 레이팅: {user?.elo_rating}</p>
            <p>전적: {user?.wins}승 {user?.losses}패</p>
            <p>승률: {user?.total_battles ? ((user.wins / user.total_battles) * 100).toFixed(1) : 0}%</p>
          </div>

          <div className="card">
            {!character ? (
              <>
                <h2>캐릭터 생성</h2>
                <form onSubmit={handleCreateCharacter}>
                  <div className="form-group">
                    <label>캐릭터 이름</label>
                    <input
                      type="text"
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      required
                      maxLength={50}
                    />
                  </div>

                  <div className="form-group">
                    <label>캐릭터 유형</label>
                    <select
                      value={characterType}
                      onChange={(e) => setCharacterType(e.target.value as any)}
                    >
                      <option value="normal">일반인</option>
                      <option value="legendary">전설적인 인물</option>
                      <option value="fictional">가상의 인물</option>
                      <option value="historical">역사적 인물</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>배틀 챗 (100자 이내)</label>
                    <textarea
                      value={battleChat}
                      onChange={(e) => setBattleChat(e.target.value)}
                      required
                      maxLength={100}
                      rows={3}
                    />
                  </div>

                  {error && <div className="error">{error}</div>}

                  <button type="submit" disabled={loading}>
                    캐릭터 생성
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2>내 캐릭터</h2>
                <p><strong>{character.name}</strong></p>
                <p>유형: {character.type === 'normal' ? '일반인' : 
                         character.type === 'legendary' ? '전설적인 인물' :
                         character.type === 'fictional' ? '가상의 인물' : '역사적 인물'}</p>
                <div className="battle-chat">"{character.battle_chat}"</div>
                <button onClick={handleStartBattle} className="battle-button">
                  배틀 시작
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h2>리더보드</h2>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>플레이어</th>
                <th>캐릭터</th>
                <th>ELO</th>
                <th>승률</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={entry.id}>
                  <td>{index + 1}</td>
                  <td>{entry.username}</td>
                  <td>{entry.character_name || '-'}</td>
                  <td>{entry.elo_rating}</td>
                  <td>{entry.win_rate.toFixed(1)}%</td>
                  <td>
                    <span className={`online-indicator ${entry.is_online ? 'online' : 'offline'}`}></span>
                    {entry.is_online ? '온라인' : '오프라인'}
                  </td>
                  <td>
                    {entry.id !== user?.id && entry.is_online && (
                      <button
                        onClick={() => handleChallenge(entry.id)}
                        className="battle-button"
                        disabled={!character}
                      >
                        도전
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}