import { getDb } from './db';
import { ollamaService } from './ollama';

interface BattleResult {
  winner: 'player1' | 'player2';
  player1_new_elo: number;
  player2_new_elo: number;
}

// Ollama AI를 사용한 판정 시스템
export async function judgeBattle(chat1: string, chat2: string): Promise<'player1' | 'player2'> {
  try {
    // Ollama 서비스가 사용 가능한지 확인
    const isOllamaAvailable = await ollamaService.testConnection();
    
    if (isOllamaAvailable) {
      // Ollama AI 판정 사용
      const result = await ollamaService.judgeBattle(chat1, chat2);
      console.log('Ollama 판정 결과:', result);
      return result.winner;
    } else {
      console.log('Ollama를 사용할 수 없습니다. 기본 판정 로직을 사용합니다.');
      return fallbackJudgeBattle(chat1, chat2);
    }
  } catch (error) {
    console.error('AI 판정 중 오류 발생:', error);
    return fallbackJudgeBattle(chat1, chat2);
  }
}

// 기존의 간단한 판정 로직 (폴백용)
function fallbackJudgeBattle(chat1: string, chat2: string): 'player1' | 'player2' {
  // 여러 요소를 고려한 점수 계산
  let score1 = 0;
  let score2 = 0;

  // 1. 길이 점수 (적절한 길이)
  const len1 = chat1.length;
  const len2 = chat2.length;
  score1 += Math.min(len1 / 10, 10);
  score2 += Math.min(len2 / 10, 10);

  // 2. 특수 키워드 점수
  const powerWords = ['승리', '정복', '최강', '무적', '전설', '마스터', '챔피언', '영웅', '천재'];
  const emotionalWords = ['열정', '투지', '의지', '각오', '결의', '신념'];
  
  powerWords.forEach(word => {
    if (chat1.includes(word)) score1 += 3;
    if (chat2.includes(word)) score2 += 3;
  });

  emotionalWords.forEach(word => {
    if (chat1.includes(word)) score1 += 2;
    if (chat2.includes(word)) score2 += 2;
  });

  // 3. 느낌표와 물음표 사용
  score1 += (chat1.match(/!/g) || []).length * 1.5;
  score2 += (chat2.match(/!/g) || []).length * 1.5;
  score1 += (chat1.match(/\?/g) || []).length * 1;
  score2 += (chat2.match(/\?/g) || []).length * 1;

  // 4. 창의성 점수 (고유 단어 수)
  const uniqueWords1 = new Set(chat1.split(/\s+/)).size;
  const uniqueWords2 = new Set(chat2.split(/\s+/)).size;
  score1 += uniqueWords1 * 0.5;
  score2 += uniqueWords2 * 0.5;

  // 5. 약간의 랜덤 요소 추가
  score1 += Math.random() * 5;
  score2 += Math.random() * 5;

  return score1 > score2 ? 'player1' : 'player2';
}

// ELO 레이팅 계산
export function calculateEloRating(winnerElo: number, loserElo: number): { winnerNewElo: number; loserNewElo: number } {
  const K = 32; // K-factor
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  const winnerNewElo = Math.round(winnerElo + K * (1 - expectedWinner));
  const loserNewElo = Math.round(loserElo + K * (0 - expectedLoser));

  return { winnerNewElo, loserNewElo };
}

export async function processBattle(
  player1Id: number,
  player1CharacterId: number,
  player1Chat: string,
  player2Id: number,
  player2CharacterId: number,
  player2Chat: string,
  isAiBattle: boolean
): Promise<BattleResult> {
  const db = await getDb();

  // 현재 ELO 가져오기
  const player1 = await db.get('SELECT elo_rating FROM users WHERE id = ?', player1Id);
  const player2 = await db.get('SELECT elo_rating FROM users WHERE id = ?', player2Id);

  // 배틀 판정 (이제 비동기)
  const winner = await judgeBattle(player1Chat, player2Chat);
  const winnerId = winner === 'player1' ? player1Id : player2Id;

  // ELO 계산
  let player1NewElo = player1.elo_rating;
  let player2NewElo = player2.elo_rating;

  if (winner === 'player1') {
    const { winnerNewElo, loserNewElo } = calculateEloRating(player1.elo_rating, player2.elo_rating);
    player1NewElo = winnerNewElo;
    player2NewElo = loserNewElo;
  } else {
    const { winnerNewElo, loserNewElo } = calculateEloRating(player2.elo_rating, player1.elo_rating);
    player2NewElo = winnerNewElo;
    player1NewElo = loserNewElo;
  }

  // 배틀 기록 저장
  await db.run(`
    INSERT INTO battles (
      player1_id, player1_character_id, player1_chat,
      player2_id, player2_character_id, player2_chat,
      winner_id, player1_elo_before, player1_elo_after,
      player2_elo_before, player2_elo_after, is_ai_battle,
      ended_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    player1Id, player1CharacterId, player1Chat,
    player2Id, player2CharacterId, player2Chat,
    winnerId, player1.elo_rating, player1NewElo,
    player2.elo_rating, player2NewElo, isAiBattle ? 1 : 0
  ]);

  // 유저 통계 업데이트
  if (winner === 'player1') {
    await db.run(`
      UPDATE users 
      SET elo_rating = ?, total_battles = total_battles + 1, wins = wins + 1 
      WHERE id = ?
    `, [player1NewElo, player1Id]);
    
    await db.run(`
      UPDATE users 
      SET elo_rating = ?, total_battles = total_battles + 1, losses = losses + 1 
      WHERE id = ?
    `, [player2NewElo, player2Id]);
  } else {
    await db.run(`
      UPDATE users 
      SET elo_rating = ?, total_battles = total_battles + 1, losses = losses + 1 
      WHERE id = ?
    `, [player1NewElo, player1Id]);
    
    await db.run(`
      UPDATE users 
      SET elo_rating = ?, total_battles = total_battles + 1, wins = wins + 1 
      WHERE id = ?
    `, [player2NewElo, player2Id]);
  }

  return {
    winner,
    player1_new_elo: player1NewElo,
    player2_new_elo: player2NewElo
  };
}