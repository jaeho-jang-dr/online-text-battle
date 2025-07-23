'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Character } from '@/types';

interface Opponent {
  user_id: number;
  username: string;
  character: Character;
  is_ai: boolean;
}

export default function Battle() {
  const [user, setUser] = useState<User | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [battleChat, setBattleChat] = useState('');
  const [battleResult, setBattleResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challenge');

  useEffect(() => {
    initializeBattle();
  }, []);

  const initializeBattle = async () => {
    try {
      // 인증 확인
      const authRes = await fetch('/api/auth/verify');
      if (!authRes.ok) {
        router.push('/');
        return;
      }
      const authData = await authRes.json();
      setUser(authData.user);

      // 캐릭터 가져오기
      const charRes = await fetch(`/api/character/${authData.user.id}`);
      if (!charRes.ok) {
        router.push('/lobby');
        return;
      }
      const charData = await charRes.json();
      if (!charData.character) {
        router.push('/lobby');
        return;
      }
      setCharacter(charData.character);
      setBattleChat(charData.character.battle_chat);

      // 매치메이킹
      const matchRes = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: charData.character.id,
          challengeId: challengeId ? parseInt(challengeId) : null
        })
      });

      if (!matchRes.ok) {
        router.push('/lobby');
        return;
      }

      const matchData = await matchRes.json();
      if (matchData.success && matchData.opponent) {
        setOpponent(matchData.opponent);
      } else {
        router.push('/lobby');
      }
    } catch (error) {
      console.error('Battle initialization error:', error);
      router.push('/lobby');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBattle = async () => {
    if (!character || !opponent) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/battle/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1CharacterId: character.id,
          player1Chat: battleChat,
          player2Id: opponent.user_id,
          player2CharacterId: opponent.character.id,
          player2Chat: opponent.character.battle_chat,
          isAiBattle: opponent.is_ai
        })
      });

      if (res.ok) {
        const result = await res.json();
        setBattleResult(result);
      }
    } catch (error) {
      console.error('Battle submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToLobby = () => {
    router.push('/lobby');
  };

  if (loading) {
    return <div className="container">매칭 중...</div>;
  }

  if (!opponent) {
    return <div className="container">상대를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="container">
      <h1>배틀 아레나</h1>

      <div className="grid" style={{ marginTop: '30px' }}>
        <div className="card">
          <h2>{character?.name}</h2>
          <p>타입: {character?.type === 'normal' ? '일반인' : 
                   character?.type === 'legendary' ? '전설적인 인물' :
                   character?.type === 'fictional' ? '가상의 인물' : '역사적 인물'}</p>
          
          {!battleResult ? (
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>배틀 챗 (100자 이내)</label>
              <textarea
                value={battleChat}
                onChange={(e) => setBattleChat(e.target.value)}
                maxLength={100}
                rows={3}
                disabled={submitting}
              />
              <p style={{ fontSize: '14px', marginTop: '5px' }}>
                {battleChat.length}/100
              </p>
            </div>
          ) : (
            <div className="battle-chat" style={{ marginTop: '20px' }}>
              "{battleChat}"
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2>VS</h2>
        </div>

        <div className="card">
          <h2>{opponent.character.name}</h2>
          <p>플레이어: {opponent.username} {opponent.is_ai && '(AI)'}</p>
          <p>타입: {opponent.character.type === 'normal' ? '일반인' : 
                   opponent.character.type === 'legendary' ? '전설적인 인물' :
                   opponent.character.type === 'fictional' ? '가상의 인물' : '역사적 인물'}</p>
          
          <div className="battle-chat" style={{ marginTop: '20px' }}>
            "{opponent.character.battle_chat}"
          </div>
        </div>
      </div>

      {!battleResult ? (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={handleSubmitBattle}
            disabled={submitting || !battleChat.trim()}
            className="battle-button"
            style={{ fontSize: '20px', padding: '15px 40px' }}
          >
            {submitting ? '배틀 진행 중...' : '배틀 시작!'}
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginTop: '40px', textAlign: 'center' }}>
          <h2>배틀 결과</h2>
          <h1 style={{ margin: '30px 0', color: battleResult.winner === 'you' ? '#4caf50' : '#ff6b6b' }}>
            {battleResult.winner === 'you' ? '승리!' : '패배...'}
          </h1>
          
          <div style={{ marginBottom: '30px' }}>
            <p>당신의 새 ELO: {battleResult.yourNewElo} ({battleResult.yourEloChange > 0 ? '+' : ''}{battleResult.yourEloChange})</p>
            <p>상대의 새 ELO: {battleResult.opponentNewElo} ({battleResult.opponentEloChange > 0 ? '+' : ''}{battleResult.opponentEloChange})</p>
          </div>

          <button onClick={handleBackToLobby}>
            로비로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}