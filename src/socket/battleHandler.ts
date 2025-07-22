import { Server, Socket } from 'socket.io';
import { BattleModel } from '../models/Battle';
import { CharacterModel } from '../models/Character';
import { ClientToServerEvents, ServerToClientEvents, ActionType } from '../types';
import jwt from 'jsonwebtoken';

interface SocketUser {
  id: number;
  username: string;
  is_admin: boolean;
}

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  user?: SocketUser;
}

// 매치메이킹 큐
const matchmakingQueue: Map<number, { 
  characterId: number; 
  socketId: string; 
  joinedAt: Date 
}> = new Map();

// 활성 배틀 룸
const activeBattles: Map<number, Set<string>> = new Map();

export function setupBattleHandlers(io: Server) {
  // Socket 인증 미들웨어
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('인증 토큰이 필요합니다.'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      socket.user = {
        id: decoded.userId,
        username: decoded.username,
        is_admin: decoded.is_admin || false
      };

      next();
    } catch (error) {
      next(new Error('유효하지 않은 토큰입니다.'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`사용자 연결: ${socket.user?.username} (${socket.id})`);

    // 매치메이킹 참여
    socket.on('battle:join', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('battle:error', { message: '인증되지 않은 사용자입니다.' });
          return;
        }

        const { characterId } = data;
        
        // 캐릭터 소유권 확인
        const character = await CharacterModel.findById(characterId);
        if (!character) {
          socket.emit('battle:error', { message: '캐릭터를 찾을 수 없습니다.' });
          return;
        }

        if (character.user_id !== socket.user.id) {
          socket.emit('battle:error', { message: '자신의 캐릭터만 사용할 수 있습니다.' });
          return;
        }

        // 이미 활성 배틀이 있는지 확인
        const activeBattle = await BattleModel.findActiveByCharacterId(characterId);
        if (activeBattle) {
          socket.emit('battle:error', { message: '이미 진행 중인 배틀이 있습니다.' });
          return;
        }

        // 이미 큐에 있는지 확인
        if (matchmakingQueue.has(characterId)) {
          socket.emit('battle:error', { message: '이미 매치메이킹 중입니다.' });
          return;
        }

        // 매치메이킹 큐에 추가
        matchmakingQueue.set(characterId, {
          characterId,
          socketId: socket.id,
          joinedAt: new Date()
        });

        console.log(`매치메이킹 큐 참여: ${character.name} (${characterId})`);

        // 매치 찾기
        await findMatch(io, characterId);

      } catch (error) {
        console.error('배틀 참여 오류:', error);
        socket.emit('battle:error', { message: '서버 오류가 발생했습니다.' });
      }
    });

    // 배틀 액션
    socket.on('battle:action', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('battle:error', { message: '인증되지 않은 사용자입니다.' });
          return;
        }

        const { battleId, characterId, actionType, skillId, targetId } = data;

        // 배틀 룸에 있는지 확인
        const battleRoom = activeBattles.get(battleId);
        if (!battleRoom || !battleRoom.has(socket.id)) {
          socket.emit('battle:error', { message: '배틀에 참여하지 않았습니다.' });
          return;
        }

        // 액션 수행
        const result = await BattleModel.performAction(
          battleId,
          characterId,
          actionType,
          skillId,
          targetId
        );

        if (result.success) {
          // 배틀 룸의 모든 플레이어에게 업데이트 전송
          io.to(`battle-${battleId}`).emit('battle:update', {
            battle: result.data!.battle,
            action: result.data!.action
          });

          // 배틀이 종료된 경우
          if (result.data!.battle.status === 'finished') {
            io.to(`battle-${battleId}`).emit('battle:end', {
              battle: result.data!.battle,
              winner: result.data!.battle.winner_name || '무승부'
            });

            // 배틀 룸 정리
            cleanupBattleRoom(io, battleId);
          }
        } else {
          socket.emit('battle:error', { message: result.message || '액션 실행 실패' });
        }

      } catch (error) {
        console.error('배틀 액션 오류:', error);
        socket.emit('battle:error', { message: '서버 오류가 발생했습니다.' });
      }
    });

    // 배틀 포기
    socket.on('battle:surrender', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('battle:error', { message: '인증되지 않은 사용자입니다.' });
          return;
        }

        const { battleId, characterId } = data;

        const result = await BattleModel.surrender(battleId, characterId);
        
        if (result.success) {
          io.to(`battle-${battleId}`).emit('battle:end', {
            battle: result.data!,
            winner: `${result.data!.winner_name} 승리 (상대방 항복)`
          });

          cleanupBattleRoom(io, battleId);
        } else {
          socket.emit('battle:error', { message: result.message || '항복 처리 실패' });
        }

      } catch (error) {
        console.error('배틀 포기 오류:', error);
        socket.emit('battle:error', { message: '서버 오류가 발생했습니다.' });
      }
    });

    // 배틀 나가기
    socket.on('battle:leave', (data) => {
      const { battleId } = data;
      socket.leave(`battle-${battleId}`);
      
      const battleRoom = activeBattles.get(battleId);
      if (battleRoom) {
        battleRoom.delete(socket.id);
        if (battleRoom.size === 0) {
          activeBattles.delete(battleId);
        }
      }
    });

    // 연결 해제 처리
    socket.on('disconnect', () => {
      console.log(`사용자 연결 해제: ${socket.user?.username} (${socket.id})`);
      
      // 매치메이킹 큐에서 제거
      for (const [characterId, queueData] of matchmakingQueue.entries()) {
        if (queueData.socketId === socket.id) {
          matchmakingQueue.delete(characterId);
          console.log(`매치메이킹 큐에서 제거: ${characterId}`);
          break;
        }
      }

      // 활성 배틀에서 제거
      for (const [battleId, battleRoom] of activeBattles.entries()) {
        if (battleRoom.has(socket.id)) {
          battleRoom.delete(socket.id);
          if (battleRoom.size === 0) {
            activeBattles.delete(battleId);
          }
        }
      }
    });
  });
}

// 매치 찾기 함수
async function findMatch(io: Server, newCharacterId: number) {
  try {
    // 큐에서 다른 플레이어 찾기
    let opponentData = null;
    for (const [characterId, queueData] of matchmakingQueue.entries()) {
      if (characterId !== newCharacterId) {
        opponentData = { characterId, ...queueData };
        break;
      }
    }

    if (!opponentData) {
      // 매치를 찾지 못함, 대기 상태 유지
      console.log(`매치 대기 중: ${newCharacterId}`);
      return;
    }

    // 매치 발견! 배틀 생성
    const newPlayerData = matchmakingQueue.get(newCharacterId)!;
    
    // 큐에서 제거
    matchmakingQueue.delete(newCharacterId);
    matchmakingQueue.delete(opponentData.characterId);

    // 배틀 생성
    const battleResult = await BattleModel.create(newCharacterId, opponentData.characterId);
    
    if (!battleResult.success) {
      console.error('배틀 생성 실패:', battleResult.message);
      
      // 큐에 다시 추가
      matchmakingQueue.set(newCharacterId, newPlayerData);
      matchmakingQueue.set(opponentData.characterId, opponentData);
      return;
    }

    const battle = battleResult.data!;
    
    // 배틀 시작
    const startResult = await BattleModel.startBattle(battle.id);
    if (!startResult.success) {
      console.error('배틀 시작 실패:', startResult.message);
      return;
    }

    // 소켓들을 배틀 룸에 추가
    const newPlayerSocket = io.sockets.sockets.get(newPlayerData.socketId);
    const opponentSocket = io.sockets.sockets.get(opponentData.socketId);

    if (newPlayerSocket && opponentSocket) {
      const roomName = `battle-${battle.id}`;
      
      newPlayerSocket.join(roomName);
      opponentSocket.join(roomName);

      // 활성 배틀에 추가
      activeBattles.set(battle.id, new Set([
        newPlayerData.socketId,
        opponentData.socketId
      ]));

      // 플레이어들에게 매치 알림
      const updatedBattle = await BattleModel.findById(battle.id);
      if (updatedBattle) {
        io.to(roomName).emit('battle:matched', {
          battle: updatedBattle
        });

        io.to(roomName).emit('battle:start', {
          battle: updatedBattle
        });
      }

      console.log(`배틀 시작: ${battle.id} (${newCharacterId} vs ${opponentData.characterId})`);
    }

  } catch (error) {
    console.error('매치 찾기 오류:', error);
  }
}

// 배틀 룸 정리
function cleanupBattleRoom(io: Server, battleId: number) {
  const battleRoom = activeBattles.get(battleId);
  if (battleRoom) {
    for (const socketId of battleRoom) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(`battle-${battleId}`);
      }
    }
    activeBattles.delete(battleId);
  }
}

// 매치메이킹 통계
export function getMatchmakingStats() {
  return {
    queueSize: matchmakingQueue.size,
    activeBattles: activeBattles.size,
    queuePlayers: Array.from(matchmakingQueue.entries()).map(([characterId, data]) => ({
      characterId,
      waitTime: Date.now() - data.joinedAt.getTime()
    }))
  };
}