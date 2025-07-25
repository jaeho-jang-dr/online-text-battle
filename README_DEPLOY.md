# 🚀 Online Text Battle - 배포 가이드

## Render.com으로 원클릭 배포

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/jaeho-jang-dr/online-text-battle)

위 버튼을 클릭하면 자동으로 배포됩니다!

## 수동 배포 방법

1. [render.com](https://render.com) 접속
2. GitHub로 로그인
3. "New +" → "Web Service" 클릭
4. Repository 연결: `jaeho-jang-dr/online-text-battle`
5. 설정 확인 후 "Create Web Service" 클릭

## 환경 변수 (자동 설정됨)
- `NODE_ENV`: production
- `JWT_SECRET`: (자동 생성됨)
- `PORT`: 10000

## 배포 후 URL
`https://online-text-battle.onrender.com`