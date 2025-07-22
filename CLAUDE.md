# Online Text Battle - 개발 가이드

## 프로젝트 개요
온라인 텍스트 기반 배틀 게임을 개발하는 프로젝트입니다. 실시간 멀티플레이어 텍스트 배틀 시스템을 구현합니다.

## 개발 단계별 계획

### Phase 1: 프로젝트 기반 설정 및 기본 구조
- [x] 프로젝트 초기화 및 폴더 구조 생성
- [ ] package.json 설정 (Node.js, TypeScript, Express, Socket.io)
- [ ] TypeScript 설정
- [ ] 기본 Express 서버 구조
- [ ] 클라이언트 HTML/CSS/JS 기본 구조

### Phase 2: 사용자 시스템
- [ ] 사용자 등록/로그인 시스템
- [ ] 캐릭터 생성 및 관리
- [ ] 기본 스킬 시스템
- [ ] 사용자 프로필 관리

### Phase 3: 배틀 시스템
- [ ] 실시간 배틀 로직
- [ ] 턴 기반 전투 시스템
- [ ] 스킬 사용 및 데미지 계산
- [ ] 승부 결정 및 결과 처리

### Phase 4: 매치메이킹 및 고급 기능
- [ ] 자동 매치메이킹 시스템
- [ ] 랭킹 시스템
- [ ] 리플레이 기능
- [ ] 채팅 시스템

## 기술 스택
- **Backend**: Node.js, TypeScript, Express.js, Socket.io
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: SQLite (개발), PostgreSQL (프로덕션)
- **Real-time**: Socket.io
- **Build Tool**: TypeScript 컴파일러

## 데이터베이스 스키마
- Users: 사용자 정보
- Characters: 캐릭터 정보
- Skills: 스킬 데이터
- Battles: 배틀 기록
- Rankings: 랭킹 정보

## 실행 방법
```bash
# 개발 환경 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

## 현재 진행 상황
- Phase 1 진행 중
- 기본 프로젝트 구조 설정 완료
- 다음: package.json 및 TypeScript 설정

## 개발 규칙
- 모든 코드는 TypeScript로 작성
- ESLint + Prettier 코드 스타일 준수
- 단위 테스트 작성 권장
- Git 커밋 메시지는 Conventional Commits 형식 사용

## 참고사항
- MCP 서버들이 설치되어 있음 (filesystem, github, memory, context7, magic, playwright, nx, tavily, desktop-commander, firecrawl 등)
- SuperClaude를 활용한 AI 기반 개발 워크플로우 적용 가능