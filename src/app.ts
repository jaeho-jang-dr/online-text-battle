import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';

// 환경 변수 로드
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../client')));

// 라우트 import
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import characterRoutes from './routes/character';
import battleRoutes from './routes/battle';
import chatRoutes from './routes/chat';
import replayRoutes from './routes/replay';
import rankingRoutes from './routes/ranking';

// API 라우트
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/replays', replayRoutes);
app.use('/api/rankings', rankingRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 관리자 페이지
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin.html'));
});

// API 상태 체크
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Online Text Battle Server is running',
    timestamp: new Date().toISOString()
  });
});

// 소켓 핸들러 설정
import { setupBattleHandlers } from './socket/battleHandler';
import { setupChatHandlers } from './socket/chatHandler';

// 소켓 이벤트 설정
setupBattleHandlers(io);
setupChatHandlers(io);

// 기본 소켓 이벤트
io.on('connection', (socket) => {
  // 기본 메시지 이벤트 (채팅용)
  socket.on('message', (data) => {
    console.log('받은 메시지:', data);
    socket.broadcast.emit('message', data);
  });
});

// 에러 핸들링
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('서버 오류:', err);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류',
    error: process.env.NODE_ENV === 'development' ? err.message : '서버 오류'
  });
});

// 404 핸들링
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    message: '페이지를 찾을 수 없습니다.'
  });
});

const PORT = process.env.PORT || 3000;

// 서버 시작 함수
async function startServer() {
  try {
    // 데이터베이스 초기화
    await initializeDatabase();
    
    server.listen(PORT, () => {
      console.log(`🚀 온라인 텍스트 배틀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📱 클라이언트: http://localhost:${PORT}`);
      console.log(`🔧 API 상태: http://localhost:${PORT}/api/health`);
      console.log(`👨‍💼 관리자 패널: http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();

export { app, server, io };