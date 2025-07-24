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
  let strengths1 = [];
  let strengths2 = [];

  // 1. 길이 점수 (적절한 길이)
  const len1 = chat1.length;
  const len2 = chat2.length;
  const lenScore1 = Math.min(len1 / 10, 10);
  const lenScore2 = Math.min(len2 / 10, 10);
  score1 += lenScore1;
  score2 += lenScore2;
  
  if (len1 > 80) strengths1.push('압도적인 기세');
  if (len2 > 80) strengths2.push('압도적인 기세');

  // 2. 특수 키워드 점수
  const powerWords = ['승리', '정복', '최강', '무적', '전설', '마스터', '챔피언', '영웅', '천재'];
  const emotionalWords = ['열정', '투지', '의지', '각오', '결의', '신념'];
  const actionWords = ['파괴', '분쇄', '격파', '돌파', '제압', '섬멸', '폭발', '번개', '화염'];
  
  let powerScore1 = 0, powerScore2 = 0;
  let foundPower1 = false, foundPower2 = false;
  
  powerWords.forEach(word => {
    if (chat1.includes(word)) { powerScore1 += 3; foundPower1 = true; }
    if (chat2.includes(word)) { powerScore2 += 3; foundPower2 = true; }
  });

  emotionalWords.forEach(word => {
    if (chat1.includes(word)) powerScore1 += 2;
    if (chat2.includes(word)) powerScore2 += 2;
  });
  
  actionWords.forEach(word => {
    if (chat1.includes(word)) powerScore1 += 2.5;
    if (chat2.includes(word)) powerScore2 += 2.5;
  });
  
  score1 += powerScore1;
  score2 += powerScore2;
  
  if (foundPower1) strengths1.push('위압적인 언어 구사');
  if (foundPower2) strengths2.push('위압적인 언어 구사');

  // 3. 느낌표와 물음표 사용
  const exclamation1 = (chat1.match(/!/g) || []).length;
  const exclamation2 = (chat2.match(/!/g) || []).length;
  const question1 = (chat1.match(/\?/g) || []).length;
  const question2 = (chat2.match(/\?/g) || []).length;
  
  score1 += exclamation1 * 1.5 + question1 * 2;
  score2 += exclamation2 * 1.5 + question2 * 2;
  
  if (exclamation1 > 2) strengths1.push('열정적인 전투 의지');
  if (exclamation2 > 2) strengths2.push('열정적인 전투 의지');
  if (question1 > 0) strengths1.push('심리전 구사');
  if (question2 > 0) strengths2.push('심리전 구사');

  // 4. 창의성 점수 (고유 단어 수)
  const uniqueWords1 = new Set(chat1.split(/\s+/)).size;
  const uniqueWords2 = new Set(chat2.split(/\s+/)).size;
  score1 += uniqueWords1 * 0.5;
  score2 += uniqueWords2 * 0.5;
  
  if (uniqueWords1 > 15) strengths1.push('다채로운 표현력');
  if (uniqueWords2 > 15) strengths2.push('다채로운 표현력');

  // 5. 특수 문자와 이모티콘
  const hasSpecial1 = /[★☆♥♡⚔️🔥💥⚡️🌟✨]/.test(chat1);
  const hasSpecial2 = /[★☆♥♡⚔️🔥💥⚡️🌟✨]/.test(chat2);
  
  if (hasSpecial1) { score1 += 3; strengths1.push('화려한 연출'); }
  if (hasSpecial2) { score2 += 3; strengths2.push('화려한 연출'); }

  // 6. 약간의 랜덤 요소 추가
  const random1 = Math.random() * 5;
  const random2 = Math.random() * 5;
  score1 += random1;
  score2 += random2;

  const winner = score1 > score2 ? 'player1' : 'player2';
  const winnerStrengths = winner === 'player1' ? strengths1 : strengths2;
  const loserStrengths = winner === 'player1' ? strengths2 : strengths1;
  
  // 재미있는 판정 이유 생성
  const judgmentTemplates = [
    `압도적인 ${winnerStrengths[0] || '전투력'}으로 상대를 제압! ${loserStrengths[0] ? `상대의 ${loserStrengths[0]}도 훌륭했지만 역부족이었다.` : ''}`,
    `${winnerStrengths.join('과 ')}의 완벽한 조합! 이것이 진정한 전사의 모습이다!`,
    `관중들이 열광한다! ${winnerStrengths[0] || '놀라운 실력'}을 보여준 승자의 압승!`,
    `${Math.abs(score1 - score2) < 5 ? '박빙의 승부였다! 하지만' : '일방적인 승부!'} ${winnerStrengths[0] || '뛰어난 전투 감각'}이 승부를 갈랐다!`,
    `전설은 이렇게 만들어진다! ${winnerStrengths.slice(0, 2).join(', ')}로 완벽한 승리를 거뒀다!`
  ];
  
  const reason = judgmentTemplates[Math.floor(Math.random() * judgmentTemplates.length)];

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