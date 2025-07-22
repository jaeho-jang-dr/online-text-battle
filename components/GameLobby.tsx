import { useState, useEffect } from 'react';
import CharacterSetup from './CharacterSetup';
import BattleQueue from './BattleQueue';
import BattleRoom from './BattleRoom';
import Leaderboard from './Leaderboard';
import styles from '../styles/GameLobby.module.css';

interface GameLobbyProps {
  user: any;
}

export default function GameLobby({ user }: GameLobbyProps) {
  const [character, setCharacter] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'lobby' | 'queue' | 'battle'>('lobby');
  const [battleData, setBattleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCharacter();
  }, []);

  const loadCharacter = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/character/get', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCharacter(data.character);
      }
    } catch (error) {
      console.error('Failed to load character:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCharacterCreated = (newCharacter: any) => {
    setCharacter(newCharacter);
  };

  const handleJoinQueue = () => {
    setCurrentView('queue');
  };

  const handleBattleStart = (battle: any) => {
    setBattleData(battle);
    setCurrentView('battle');
  };

  const handleBattleEnd = () => {
    setCurrentView('lobby');
    setBattleData(null);
    // Reload user data to update ELO
    window.location.reload();
  };

  if (loading) {
    return <div className={styles.loading}>캐릭터 정보를 불러오는 중...</div>;
  }

  if (!character) {
    return <CharacterSetup onCharacterCreated={handleCharacterCreated} />;
  }

  return (
    <div className={styles.lobby}>
      {currentView === 'lobby' && (
        <>
          <div className={styles.characterInfo}>
            <h3>내 캐릭터</h3>
            <div className={styles.characterCard}>
              <h4>{character.name}</h4>
              <p className={styles.battleText}>"{character.battle_text}"</p>
              <div className={styles.stats}>
                <span>승: {user.wins}</span>
                <span>패: {user.losses}</span>
                <span>ELO: {user.elo_rating}</span>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button 
              onClick={handleJoinQueue}
              className={styles.battleBtn}
            >
              배틀 시작
            </button>
          </div>

          <Leaderboard />
        </>
      )}

      {currentView === 'queue' && (
        <BattleQueue 
          user={user}
          character={character}
          onBattleStart={handleBattleStart}
          onCancel={() => setCurrentView('lobby')}
        />
      )}

      {currentView === 'battle' && battleData && (
        <BattleRoom 
          user={user}
          character={character}
          battleData={battleData}
          onBattleEnd={handleBattleEnd}
        />
      )}
    </div>
  );
}