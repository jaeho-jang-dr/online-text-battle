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
    const prompt = `당신은 텍스트 배틀 게임의 심판입니다. 두 플레이어의 전투 대사를 분석하고 승자를 결정해주세요.

플레이어 1의 대사: "${chat1}"
플레이어 2의 대사: "${chat2}"

다음 기준으로 평가해주세요:
1. 창의성과 독창성 (30점)
2. 캐릭터의 일관성과 몰입도 (25점)
3. 전투 상황 묘사의 구체성 (25점)
4. 언어의 파워와 임팩트 (20점)

JSON 형식으로 답변해주세요:
{
  "winner": "player1" 또는 "player2",
  "reason": "승리 이유를 한 문장으로",
  "score1": 플레이어1 점수 (0-100),
  "score2": 플레이어2 점수 (0-100)
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