import { getDb } from './db';
import { ollamaService } from './ollama';

interface BattleResult {
  winner: 'player1' | 'player2';
  player1_new_elo: number;
  player2_new_elo: number;
  judgment_reason: string;
  player1_score: number;
  player2_score: number;
}

// Ollama AI를 사용한 판정 시스템
export async function judgeBattleWithDetails(chat1: string, chat2: string) {
  try {
    // Ollama 서비스가 사용 가능한지 확인
    const isOllamaAvailable = await ollamaService.testConnection();
    
    if (isOllamaAvailable) {
      // Ollama AI 판정 사용
      const result = await ollamaService.judgeBattle(chat1, chat2);
      console.log('Ollama 판정 결과:', result);
      return result;
    } else {
      console.log('Ollama를 사용할 수 없습니다. 기본 판정 로직을 사용합니다.');
      return fallbackJudgeBattleWithDetails(chat1, chat2);
    }
  } catch (error) {
    console.error('AI 판정 중 오류 발생:', error);
    return fallbackJudgeBattleWithDetails(chat1, chat2);
  }
}

// 기존 함수 유지 (호환성을 위해)
export async function judgeBattle(chat1: string, chat2: string): Promise<'player1' | 'player2'> {
  const result = await judgeBattleWithDetails(chat1, chat2);
  return result.winner;
}

// 기존의 간단한 판정 로직 (폴백용 - 상세 정보 포함)
function fallbackJudgeBattleWithDetails(chat1: string, chat2: string) {
  // 여러 요소를 고려한 점수 계산
  let score1 = 0;
  let score2 = 0;
  let reasons = [];

  // 1. 길이 점수 (적절한 길이)
  const len1 = chat1.length;
  const len2 = chat2.length;
  const lenScore1 = Math.min(len1 / 10, 10);
  const lenScore2 = Math.min(len2 / 10, 10);
  score1 += lenScore1;
  score2 += lenScore2;

  // 2. 특수 키워드 점수
  const powerWords = ['승리', '정복', '최강', '무적', '전설', '마스터', '챔피언', '영웅', '천재'];
  const emotionalWords = ['열정', '투지', '의지', '각오', '결의', '신념'];
  
  let powerScore1 = 0, powerScore2 = 0;
  powerWords.forEach(word => {
    if (chat1.includes(word)) powerScore1 += 3;
    if (chat2.includes(word)) powerScore2 += 3;
  });

  emotionalWords.forEach(word => {
    if (chat1.includes(word)) powerScore1 += 2;
    if (chat2.includes(word)) powerScore2 += 2;
  });
  
  score1 += powerScore1;
  score2 += powerScore2;

  // 3. 느낌표와 물음표 사용
  const exclamation1 = (chat1.match(/!/g) || []).length * 1.5;
  const exclamation2 = (chat2.match(/!/g) || []).length * 1.5;
  score1 += exclamation1;
  score2 += exclamation2;

  // 4. 창의성 점수 (고유 단어 수)
  const uniqueWords1 = new Set(chat1.split(/\s+/)).size;
  const uniqueWords2 = new Set(chat2.split(/\s+/)).size;
  score1 += uniqueWords1 * 0.5;
  score2 += uniqueWords2 * 0.5;

  // 5. 약간의 랜덤 요소 추가
  const random1 = Math.random() * 5;
  const random2 = Math.random() * 5;
  score1 += random1;
  score2 += random2;

  const winner = score1 > score2 ? 'player1' : 'player2';
  
  // 판정 이유 생성
  if (powerScore1 > powerScore2 || powerScore2 > powerScore1) {
    reasons.push('강력한 키워드 사용');
  }
  if (uniqueWords1 > uniqueWords2 || uniqueWords2 > uniqueWords1) {
    reasons.push('풍부한 어휘력');
  }
  if (exclamation1 > exclamation2 || exclamation2 > exclamation1) {
    reasons.push('열정적인 표현');
  }
  
  const reason = reasons.length > 0 ? 
    `${reasons.join(', ')}과 전반적인 전투 표현력을 기준으로 판정` :
    '전반적인 전투 표현력과 임팩트를 기준으로 판정';

  return {
    winner,
    reason,
    score1: Math.round(score1),
    score2: Math.round(score2)
  };
}

// 기존의 간단한 판정 로직 (폴백용)
function fallbackJudgeBattle(chat1: string, chat2: string): 'player1' | 'player2' {
  const result = fallbackJudgeBattleWithDetails(chat1, chat2);
  return result.winner;
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

  // 배틀 판정 (상세 정보 포함)
  const judgmentResult = await judgeBattleWithDetails(player1Chat, player2Chat);
  const { winner, reason, score1, score2 } = judgmentResult;
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

  // 배틀 기록 저장 (판정 이유와 점수 포함)
  await db.run(`
    INSERT INTO battles (
      player1_id, player1_character_id, player1_chat,
      player2_id, player2_character_id, player2_chat,
      winner_id, player1_elo_before, player1_elo_after,
      player2_elo_before, player2_elo_after, is_ai_battle,
      judgment_reason, player1_score, player2_score,
      ended_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    player1Id, player1CharacterId, player1Chat,
    player2Id, player2CharacterId, player2Chat,
    winnerId, player1.elo_rating, player1NewElo,
    player2.elo_rating, player2NewElo, isAiBattle ? 1 : 0,
    reason, score1, score2
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
    player2_new_elo: player2NewElo,
    judgment_reason: reason,
    player1_score: score1,
    player2_score: score2
  };
}