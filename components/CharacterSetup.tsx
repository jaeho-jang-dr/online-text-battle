import { useState } from 'react';
import styles from '../styles/CharacterSetup.module.css';

interface CharacterSetupProps {
  onCharacterCreated: (character: any) => void;
}

export default function CharacterSetup({ onCharacterCreated }: CharacterSetupProps) {
  const [formData, setFormData] = useState({
    name: '',
    battle_text: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'battle_text' && value.length > 100) {
      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/character/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onCharacterCreated(data.character);
      } else {
        setError(data.message || '캐릭터 생성에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.setupContainer}>
      <div className={styles.setupForm}>
        <h2>캐릭터 생성</h2>
        <p className={styles.description}>
          배틀에서 사용할 캐릭터를 생성하세요. 배틀 텍스트는 상대와의 대결에서 사용됩니다.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">캐릭터 이름</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={20}
              placeholder="캐릭터 이름을 입력하세요"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="battle_text">배틀 텍스트 (최대 100자)</label>
            <textarea
              id="battle_text"
              name="battle_text"
              value={formData.battle_text}
              onChange={handleChange}
              required
              minLength={10}
              maxLength={100}
              placeholder="배틀에서 사용할 텍스트를 입력하세요..."
              className={styles.battleTextArea}
            />
            <div className={styles.characterCount}>
              {formData.battle_text.length}/100
            </div>
          </div>

          <button 
            type="submit" 
            className={styles.createBtn}
            disabled={loading || formData.battle_text.length < 10}
          >
            {loading ? '생성 중...' : '캐릭터 생성'}
          </button>
        </form>
      </div>
    </div>
  );
}