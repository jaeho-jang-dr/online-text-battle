# Replit 배포 가이드

## 🚀 빠른 시작

1. **Replit에서 프로젝트 가져오기**
   - [Replit](https://replit.com)에 로그인
   - "Create Repl" → "Import from GitHub" 클릭
   - Repository URL: `https://github.com/jaeho-jang-dr/online-text-battle`

2. **환경 변수 설정**
   - Replit 프로젝트에서 "Secrets" 탭 클릭
   - 다음 변수 추가:
     ```
     JWT_SECRET=228826900860f57cc4e8eb18c1d1eb4cb97cea9798bb4187a5feb920de7f9ee8d05d1817739dd100ec461d2436a4d55f41973cc9483d66bfcfa42c2d1851726a
     NODE_ENV=production
     ```

3. **실행**
   - "Run" 버튼 클릭
   - 자동으로 의존성 설치 및 서버 시작

## 📦 프로젝트 구조

```
online-text-battle/
├── .replit          # Replit 설정 파일
├── replit.nix       # Nix 패키지 설정
├── src/             # 소스 코드
├── public/          # 정적 파일
└── package.json     # 프로젝트 의존성
```

## 🔧 설정 파일 설명

### .replit
- 개발 서버 실행 명령어
- 배포 시 빌드 및 실행 명령어
- 포트 설정 (3000 → 80)

### replit.nix
- Node.js 20.x 버전 사용
- TypeScript 지원
- 필요한 시스템 패키지 설정

## 🌐 배포

1. **Deployments 탭** 클릭
2. **"Deploy"** 버튼 클릭
3. 자동으로 프로덕션 빌드 및 배포 진행
4. 제공된 URL로 접속 가능

## ⚠️ 주의사항

- SQLite 데이터베이스는 Replit의 파일 시스템에 저장됨
- 무료 플랜의 경우 일정 시간 후 서버가 슬립 모드로 전환
- 환경 변수는 반드시 Secrets 탭에서 설정 (코드에 직접 입력 금지)

## 🔗 유용한 링크

- [Replit Docs](https://docs.replit.com)
- [Next.js on Replit](https://docs.replit.com/hosting/deploying-nextjs-to-replit)