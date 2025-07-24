interface OllamaResponse {
  response: string;
  model: string;
  done: boolean;
}

interface BattleJudgmentResult {
  winner: 'player1' | 'player2';
  reason: string;
  score1: number;
  score2: number;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor() {
    // Ollama는 기본적으로 localhost:11434에서 실행됩니다
    this.baseUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'gemma3:latest';
  }

  async judgeBattle(chat1: string, chat2: string): Promise<BattleJudgmentResult> {
    const prompt = `당신은 전설적인 배틀 아레나의 심판관입니다. 두 전사의 전투 선언을 듣고 승자를 결정해야 합니다.

전사 1의 선언: "${chat1}"
전사 2의 선언: "${chat2}"

평가 기준:
1. 🎭 캐릭터 연기력 (25점): 캐릭터의 정체성과 일관성, 몰입도
2. ⚔️ 전투 묘사력 (25점): 공격/방어 동작의 구체성과 생생함
3. 🎨 창의성 (20점): 독창적인 표현과 예상치 못한 전개
4. 💥 임팩트 (20점): 대사의 파워, 위압감, 카리스마
5. 🎯 전략성 (10점): 상대의 약점 파악, 심리전, 전술적 우위

판정 스타일:
- 핵심만 간단명료하게
- 한 문장으로 요약 (30자 이내)

JSON 형식으로 답변:
{
  "winner": "player1" 또는 "player2",
  "reason": "짧은 판정 이유 (예: '압도적인 기세로 제압!' 또는 '창의적인 전술의 승리!')",
  "score1": 점수,
  "score2": 점수
}`;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.3, // 일관된 판정을 위해 낮은 temperature
            top_p: 0.9,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      const result = JSON.parse(data.response);

      return {
        winner: result.winner,
        reason: result.reason,
        score1: result.score1,
        score2: result.score2,
      };
    } catch (error) {
      console.error('Ollama API error:', error);
      // 폴백: 기존의 간단한 판정 로직 사용
      return this.fallbackJudgment(chat1, chat2);
    }
  }

  private fallbackJudgment(chat1: string, chat2: string): BattleJudgmentResult {
    // 기존 로직을 기반으로 한 폴백 판정
    let score1 = 0;
    let score2 = 0;

    // 길이 점수
    score1 += Math.min(chat1.length / 10, 10) * 2;
    score2 += Math.min(chat2.length / 10, 10) * 2;

    // 특수 키워드
    const powerWords = ['승리', '정복', '최강', '무적', '전설', '마스터', '챔피언', '영웅', '천재'];
    powerWords.forEach(word => {
      if (chat1.includes(word)) score1 += 5;
      if (chat2.includes(word)) score2 += 5;
    });

    // 구두점
    score1 += (chat1.match(/!/g) || []).length * 3;
    score2 += (chat2.match(/!/g) || []).length * 3;

    // 고유 단어 수
    const uniqueWords1 = new Set(chat1.split(/\s+/)).size;
    const uniqueWords2 = new Set(chat2.split(/\s+/)).size;
    score1 += uniqueWords1 * 2;
    score2 += uniqueWords2 * 2;

    // 랜덤 요소
    score1 += Math.random() * 10;
    score2 += Math.random() * 10;

    const winner = score1 > score2 ? 'player1' : 'player2';
    
    return {
      winner,
      reason: '전반적인 전투 표현력과 임팩트를 기준으로 판정',
      score1: Math.round(score1),
      score2: Math.round(score2),
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }
}

export const ollamaService = new OllamaService();