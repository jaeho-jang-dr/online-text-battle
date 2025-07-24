# Railway 환경 변수 설정 예시

Railway Variables 탭에 다음 환경 변수를 추가하세요:

## 필수 환경 변수

```bash
JWT_SECRET=your-super-secret-key-2024-please-change-this
DATABASE_URL=file:./data/database.sqlite
NODE_ENV=production
```

## 선택 환경 변수 (Ollama AI 사용 시)

```bash
# 외부 Ollama 서버가 있는 경우만 설정
OLLAMA_API_URL=https://your-ollama-server.com
OLLAMA_MODEL=llama2
```

## JWT_SECRET 생성 방법

보안을 위해 강력한 JWT_SECRET을 생성하세요:

### 방법 1: 온라인 생성기
https://www.uuidgenerator.net/ 에서 UUID 생성

### 방법 2: Node.js로 생성
```javascript
console.log(require('crypto').randomBytes(64).toString('hex'))
```

### 방법 3: 직접 만들기
최소 32자 이상의 랜덤 문자열 사용
예: `my-super-secret-key-2024-jaeho-online-battle-game`

## 주의사항

1. **JWT_SECRET은 반드시 변경하세요!** 기본값 사용 시 보안 위험
2. **DATABASE_URL의 경로는 볼륨 마운트 경로(/data)와 일치해야 함**
3. **Ollama 없이도 게임은 정상 작동합니다** (기본 판정 시스템 사용)