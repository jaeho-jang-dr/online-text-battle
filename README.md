# Online Text Battle 🎮

온라인 텍스트 배틀 게임 - 100자 이내의 텍스트로 대결하는 실시간 배틀 게임

## 🚀 빠른 시작 (친구들과 함께하기)

### 방법 1: GitHub Codespaces에서 실행 (완전 무료)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/jaeho-jang-dr/online-text-battle)

1. 위 버튼 클릭 또는 [여기 클릭](https://codespaces.new/jaeho-jang-dr/online-text-battle)
2. "Create codespace" 클릭 (GitHub 로그인 필요)
3. Codespace가 열리면 자동으로 서버가 시작됩니다
4. 브라우저가 자동으로 열리거나, PORTS 탭에서 3001번 포트 클릭
5. 생성된 URL을 친구들과 공유!

**수동 실행이 필요한 경우:**
```bash
# 터미널에서 실행
./start.sh

# 또는
npm run dev
```

**장점:**
- ✅ GitHub 계정만 있으면 무료 사용 가능 (월 120시간 무료)
- ✅ 데이터베이스 포함 완전한 서버 환경
- ✅ 설치 불필요, 브라우저에서 모든 것이 실행됨

**친구들과 공유:**
- Codespace URL 형식: `https://{codespace-name}-3001.app.github.dev`
- 게스트 로그인 버튼으로 회원가입 없이 바로 플레이!

### 방법 2: Gitpod에서 실행 (무료)
[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/jaeho-jang-dr/online-text-battle)

## 기능

- 회원가입/로그인 시스템
- 캐릭터 생성 (일반인, 전설적인 인물, 가상의 인물, 역사적 인물)
- 100자 이내 배틀 챗 설정
- 실시간 매치메이킹 (실제 유저 또는 AI와 매칭)
- AI 판독 기반 승부 결정 (Ollama AI 지원)
- ELO 레이팅 시스템
- 리더보드 및 도전 기능

## 기술 스택

- Next.js 15
- TypeScript
- SQLite
- React 19
- Ollama AI (배틀 판정 시스템)

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 테스트 계정

- testuser1 / test123
- testuser2 / test123

## AI 판정 시스템 (Ollama)

이 게임은 Ollama AI를 사용하여 더욱 정교한 배틀 결과 판정을 제공합니다.

### Ollama 설치 방법
1. [Ollama 공식 사이트](https://ollama.ai)에서 다운로드
2. 설치 후 터미널에서 실행:
   ```bash
   ollama pull llama2
   ollama serve
   ```

### 환경 변수 설정 (선택사항)
```env
OLLAMA_API_URL=http://localhost:11434  # 기본값
OLLAMA_MODEL=llama2                     # 사용할 모델
```

**참고**: Ollama가 설치되지 않은 경우 자동으로 기본 판정 로직을 사용합니다.

## Version

v0.1.0 - Ollama AI 판정 시스템 추가
v0.0.0 - 초기 릴리즈