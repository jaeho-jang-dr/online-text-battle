# 온라인 텍스트 배틀 게임 v0.0.1

실시간 텍스트 기반 RPG 배틀 게임입니다. Node.js, TypeScript, Socket.io를 사용하여 구현되었습니다.

## 🎮 게임 특징

### ⚔️ 핵심 기능
- **실시간 턴제 배틀**: Socket.io를 통한 실시간 전투
- **자동 매치메이킹**: 레벨 및 랭킹 기반 자동 매칭
- **다양한 캐릭터 클래스**: 전사, 마법사, 궁수 (각각 고유한 스탯과 스킬)
- **스킬 시스템**: 40+ 가지 스킬과 레벨업 시스템
- **랭킹 시스템**: 포인트 기반 글로벌 랭킹

### 💬 커뮤니케이션
- **실시간 채팅**: 전체, 배틀, 개인 메시지 지원
- **타이핑 표시**: 실시간 타이핑 상태 표시
- **온라인 사용자**: 실시간 온라인 사용자 목록

### 📊 리플레이 및 분석
- **자동 리플레이**: 모든 배틀 자동 기록
- **배틀 분석**: 상세한 전투 로그와 통계
- **랭킹 히스토리**: 일일 랭킹 변화 추적

### 🛠️ 관리 도구
- **관리자 패널**: 실시간 서버 모니터링
- **사용자 관리**: 계정 및 캐릭터 관리
- **게임 밸런싱**: 스킬 및 스탯 조정

## 🏗️ 기술 스택

### Backend
- **Node.js** + **TypeScript** - 타입 안전한 서버 개발
- **Express.js** - RESTful API 프레임워크
- **Socket.io** - 실시간 양방향 통신
- **SQLite** - 경량 데이터베이스 (프로덕션: MySQL 지원)
- **JWT** - 인증 및 세션 관리
- **bcrypt** - 비밀번호 암호화

### Frontend
- **Vanilla JavaScript** - 순수 자바스크립트
- **Socket.io Client** - 실시간 통신
- **CSS3** - 반응형 UI 디자인
- **HTML5** - 시맨틱 마크업

## 📁 프로젝트 구조

```
online-text-battle/
├── src/
│   ├── config/
│   │   └── database.ts          # 데이터베이스 설정
│   ├── middleware/
│   │   └── auth.ts              # JWT 인증 미들웨어
│   ├── models/
│   │   ├── User.ts              # 사용자 모델
│   │   ├── Character.ts         # 캐릭터 모델
│   │   ├── Battle.ts            # 배틀 로직 모델
│   │   ├── Chat.ts              # 채팅 모델
│   │   ├── Replay.ts            # 리플레이 모델
│   │   └── Ranking.ts           # 랭킹 모델
│   ├── routes/
│   │   ├── admin.ts             # 관리자 API
│   │   ├── auth.ts              # 인증 API
│   │   ├── character.ts         # 캐릭터 API
│   │   ├── battle.ts            # 배틀 API
│   │   ├── chat.ts              # 채팅 API
│   │   ├── replay.ts            # 리플레이 API
│   │   └── ranking.ts           # 랭킹 API
│   ├── socket/
│   │   ├── battleHandler.ts     # 배틀 Socket.io 핸들러
│   │   └── chatHandler.ts       # 채팅 Socket.io 핸들러
│   ├── types/
│   │   └── index.ts             # TypeScript 타입 정의
│   └── app.ts                   # 메인 서버 파일
├── client/
│   ├── index.html               # 메인 게임 클라이언트
│   ├── admin.html               # 관리자 패널
│   ├── style.css                # 게임 스타일시트
│   ├── admin.css                # 관리자 스타일시트
│   ├── script.js                # 게임 클라이언트 로직
│   └── admin.js                 # 관리자 클라이언트 로직
├── .env                         # 환경 변수
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd online-text-battle
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env` 파일 생성:
```env
# 서버 설정
PORT=8001
NODE_ENV=development

# 클라이언트 URL
CLIENT_URL=http://localhost:3000

# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# 데이터베이스 설정 (SQLite)
DATABASE_URL=./database.sqlite

# 게임 설정
MAX_HEALTH=100
MAX_MANA=50
BASE_DAMAGE=15
TURN_TIME_LIMIT=30000
MAX_BATTLE_TIME=300000
```

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 프로덕션 빌드
```bash
npm run build
npm start
```

## 🎯 API 엔드포인트

### 인증 API (`/api/auth`)
- `POST /register` - 회원가입
- `POST /login` - 로그인  
- `GET /verify` - 토큰 검증
- `POST /refresh` - 토큰 갱신
- `POST /logout` - 로그아웃

### 캐릭터 API (`/api/characters`)
- `POST /` - 캐릭터 생성
- `GET /my` - 내 캐릭터 목록
- `GET /:id` - 캐릭터 조회
- `PUT /:id` - 캐릭터 수정
- `DELETE /:id` - 캐릭터 삭제

### 배틀 API (`/api/battles`)
- `POST /` - 배틀 생성
- `GET /:id` - 배틀 정보 조회
- `POST /:id/action` - 배틀 액션 수행
- `POST /:id/surrender` - 배틀 포기

### 채팅 API (`/api/chat`)
- `POST /send` - 메시지 전송
- `GET /global` - 전체 채팅 조회
- `GET /battle/:battleId` - 배틀 채팅 조회
- `GET /private/:userId` - 개인 메시지 조회

### 랭킹 API (`/api/rankings`)
- `GET /leaderboard` - 리더보드 조회
- `GET /character/:id` - 캐릭터 랭킹 조회
- `GET /weekly` - 주간 랭킹
- `GET /my` - 내 랭킹 정보

### 리플레이 API (`/api/replays`)
- `GET /` - 리플레이 목록 조회
- `GET /:id` - 리플레이 정보 조회
- `GET /:id/data` - 리플레이 데이터 (재생용)
- `GET /popular/list` - 인기 리플레이
- `GET /featured/list` - 추천 리플레이

## 🎮 게임 플레이

### 1. 계정 생성
- 웹 브라우저에서 `http://localhost:8001` 접속
- 회원가입 후 로그인

### 2. 캐릭터 생성
- 캐릭터 이름 입력 및 클래스 선택
- **전사**: 높은 체력과 방어력, 근접 공격 특화
- **마법사**: 높은 마나와 마법 데미지, 원거리 마법 공격
- **궁수**: 균형잡힌 스탯과 빠른 속도, 원거리 물리 공격

### 3. 배틀 참여
- 매치메이킹 큐에 참여하여 자동으로 상대방과 매칭
- 턴제 방식으로 진행되는 전투
- 기본 공격, 스킬 사용, 방어 액션 선택

### 4. 스킬 시스템
- 레벨업 시 새로운 스킬 습득
- 마나 소모를 통한 강력한 스킬 사용
- 스킬 레벨업을 통한 효과 증대

### 5. 랭킹 시스템
- 승리시 +20점, 패배시 -10점
- 글로벌 랭킹 및 레벨별 랭킹 지원
- 주간 랭킹으로 활발한 경쟁 유도

## 🔧 관리자 기능

관리자 패널 접속: `http://localhost:8001/admin`

### 대시보드
- 실시간 서버 통계
- 온라인 사용자 수
- 진행 중인 배틀 현황

### 사용자 관리
- 사용자 계정 조회/수정/삭제
- 캐릭터 정보 관리
- 계정 상태 변경

### 게임 관리
- 스킬 밸런싱
- 게임 설정 조정
- 시스템 로그 모니터링

## 📊 데이터베이스 스키마

### 주요 테이블
- **users** - 사용자 계정 정보
- **characters** - 캐릭터 정보 및 스탯
- **skills** - 게임 스킬 정보
- **character_skills** - 캐릭터별 보유 스킬
- **battles** - 배틀 정보
- **battle_actions** - 배틀 액션 로그
- **rankings** - 랭킹 정보
- **chat_messages** - 채팅 메시지
- **replays** - 배틀 리플레이
- **ranking_history** - 랭킹 변화 히스토리

## 🔒 보안 기능

- **JWT 기반 인증** - 안전한 사용자 인증
- **bcrypt 암호화** - 비밀번호 해시 처리
- **SQL Injection 방지** - 파라미터화된 쿼리 사용
- **CORS 설정** - 허용된 도메인만 접근
- **입력 검증** - 모든 사용자 입력 검증

## 📈 성능 최적화

- **데이터베이스 인덱싱** - 빠른 쿼리 수행
- **연결 풀링** - 효율적인 데이터베이스 연결 관리
- **Socket.io 룸 관리** - 효율적인 실시간 통신
- **트랜잭션 처리** - 데이터 일관성 보장

## 🐛 알려진 이슈

현재 v0.0.1에서는 다음과 같은 제한사항이 있습니다:

1. **테스트 커버리지**: 유닛 테스트 미구현
2. **에러 핸들링**: 일부 에지 케이스 처리 필요
3. **스케일링**: 단일 서버 인스턴스만 지원
4. **모바일 UI**: 모바일 최적화 미완성

## 🔮 향후 계획

### v0.1.0 예정 기능
- [ ] 아이템 시스템
- [ ] 길드 시스템
- [ ] 토너먼트 모드
- [ ] 모바일 앱 지원

### v0.2.0 예정 기능  
- [ ] AI 봇 상대
- [ ] 커스텀 맵
- [ ] 스토리 모드
- [ ] 클러스터링 지원

## 👥 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원 및 문의

- **이슈 리포트**: GitHub Issues
- **기능 요청**: GitHub Discussions
- **이메일**: [이메일 주소]

## 📄 라이선스

이 프로젝트는 ISC 라이선스 하에 배포됩니다.

---

## 🎉 v0.0.1 릴리스 노트

### ✨ 새로운 기능
- 실시간 턴제 배틀 시스템 구현
- 자동 매치메이킹 시스템
- 3가지 캐릭터 클래스 (전사, 마법사, 궁수)
- 40+ 스킬 시스템 및 레벨링
- 실시간 채팅 시스템 (전체/배틀/개인)
- 자동 리플레이 생성 및 재생
- 포인트 기반 랭킹 시스템
- 관리자 패널 및 모니터링
- JWT 기반 인증 시스템

### 🛠️ 기술적 개선
- TypeScript로 타입 안전성 확보
- Socket.io 실시간 통신 최적화
- SQLite 데이터베이스 스키마 완성
- RESTful API 설계 및 구현
- 트랜잭션 기반 데이터 일관성 보장

### 📊 통계
- **총 코드 라인**: 8,000+ 라인
- **API 엔드포인트**: 30+ 개
- **Socket.io 이벤트**: 20+ 개
- **데이터베이스 테이블**: 12개
- **개발 기간**: 완료

**🚀 온라인 텍스트 배틀 게임 v0.0.1 - 완성! 🎮**