# Online Text Battle 🎮

온라인 텍스트 배틀 게임 - 100자 이내의 텍스트로 대결하는 실시간 배틀 게임

## 🚀 빠른 시작 (친구들과 함께하기)

### 방법 1: GitHub Codespaces에서 실행 (완전 무료)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/jaeho-jang-dr/online-text-battle)

1. 위 버튼 클릭 또는 [여기 클릭](https://codespaces.new/jaeho-jang-dr/online-text-battle)
2. "Create codespace" 클릭 (GitHub 로그인 필요)
3. VS Code가 브라우저에서 열리면 터미널이 자동으로 `npm run dev` 실행
4. 우측 하단에 "Open in Browser" 알림이 뜨면 클릭
5. 또는 PORTS 탭에서 3000번 포트 우클릭 → "Open in Browser"
6. 생성된 URL을 친구들과 공유!

**장점:**
- ✅ GitHub 계정만 있으면 무료 사용 가능 (월 120시간 무료)
- ✅ 데이터베이스 포함 완전한 서버 환경
- ✅ 설치 불필요, 브라우저에서 모든 것이 실행됨

**문제 해결:**
- 서버가 자동으로 시작되지 않으면 터미널에서 `npm run dev` 실행
- 포트가 열리지 않으면 PORTS 탭에서 수동으로 3000번 포트 공개 설정

### 방법 2: Gitpod에서 실행 (무료)
[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/jaeho-jang-dr/online-text-battle)

## 기능

- 회원가입/로그인 시스템
- 캐릭터 생성 (일반인, 전설적인 인물, 가상의 인물, 역사적 인물)
- 100자 이내 배틀 챗 설정
- 실시간 매치메이킹 (실제 유저 또는 AI와 매칭)
- AI 판독 기반 승부 결정
- ELO 레이팅 시스템
- 리더보드 및 도전 기능

## 기술 스택

- Next.js 15
- TypeScript
- SQLite
- React 19

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

## Version

v0.0.0 - 초기 릴리즈