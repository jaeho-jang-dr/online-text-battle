# 🚀 Vercel 배포 가이드

## 배포 단계 (5분 소요)

1. **Vercel 가입/로그인**
   - https://vercel.com 접속
   - "Sign Up" 클릭
   - GitHub 계정으로 로그인

2. **프로젝트 Import**
   - "New Project" 클릭
   - "Import Git Repository" 선택
   - `jaeho-jang-dr/online-text-battle` 저장소 선택

3. **프로젝트 설정**
   - Framework Preset: Next.js (자동 감지됨)
   - Root Directory: ./ (그대로 둠)
   - Build Command: `npm run build` (자동 설정됨)
   - Install Command: `npm install` (자동 설정됨)

4. **환경 변수 설정**
   - "Environment Variables" 섹션에서:
   - Name: `JWT_SECRET`
   - Value: `your-secret-key-here-change-this`
   - "Add" 클릭

5. **Deploy 클릭**
   - 배포가 완료되면 URL이 생성됨
   - 예: `https://online-text-battle.vercel.app`

## 배포 후 접속

배포가 완료되면 제공된 URL로 어디서든 접속 가능:
- PC 브라우저
- 모바일 브라우저
- 태블릿

## 테스트 계정
- testuser1 / test123
- testuser2 / test123
- player1 / password123

## 주의사항
- 무료 플랜은 메모리 DB 사용으로 서버 재시작시 데이터 초기화
- 실제 운영시 PostgreSQL 등 영구 DB 연결 필요