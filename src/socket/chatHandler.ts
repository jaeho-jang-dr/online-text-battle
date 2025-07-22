import { Server, Socket } from 'socket.io';
import { ChatModel, ChatMessage } from '../models/Chat';
import { ClientToServerEvents, ServerToClientEvents } from '../types';
import jwt from 'jsonwebtoken';

interface SocketUser {
  id: number;
  username: string;
  is_admin: boolean;
}

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  user?: SocketUser;
}

// 온라인 사용자 관리
const onlineUsers: Map<number, {
  socketId: string;
  username: string;
  joinedAt: Date;
  lastActivity: Date;
}> = new Map();

// 채팅 룸 관리
const chatRooms: Map<string, Set<string>> = new Map(); // roomName -> Set of socketIds

export function setupChatHandlers(io: Server) {
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    console.log(`채팅 사용자 연결: ${socket.user.username}`);

    // 온라인 사용자 추가
    onlineUsers.set(socket.user.id, {
      socketId: socket.id,
      username: socket.user.username,
      joinedAt: new Date(),
      lastActivity: new Date()
    });

    // 전체 채팅 룸에 자동 참여
    socket.join('global-chat');
    
    // 온라인 사용자 목록 브로드캐스트
    broadcastOnlineUsers(io);

    // 시스템 메시지 - 사용자 입장
    ChatModel.saveSystemMessage(`${socket.user.username}님이 입장했습니다.`, undefined, 'global')
      .then(result => {
        if (result.success) {
          io.to('global-chat').emit('chat:message', {
            ...result.data!,
            sender_name: 'System'
          });
        }
      });

    // 글로벌 채팅 메시지 전송
    socket.on('chat:send', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('chat:error', { message: '인증되지 않은 사용자입니다.' });
          return;
        }

        const { message, channelType = 'global', battleId, recipientId } = data;

        if (!message || message.trim().length === 0) {
          socket.emit('chat:error', { message: '메시지 내용이 필요합니다.' });
          return;
        }

        // 사용자 활동 시간 업데이트
        const userInfo = onlineUsers.get(socket.user.id);
        if (userInfo) {
          userInfo.lastActivity = new Date();
        }

        // 메시지 저장
        const result = await ChatModel.saveMessage(
          socket.user.id,
          message.trim(),
          channelType,
          battleId,
          recipientId
        );

        if (result.success) {
          const chatMessage = result.data!;
          
          // 채널 타입에 따라 메시지 브로드캐스트
          switch (channelType) {
            case 'global':
              io.to('global-chat').emit('chat:message', chatMessage);
              break;
              
            case 'battle':
              if (battleId) {
                io.to(`battle-${battleId}`).emit('chat:message', chatMessage);
              }
              break;
              
            case 'private':
              if (recipientId) {
                // 발신자와 수신자에게만 전송
                socket.emit('chat:message', chatMessage);
                
                const recipient = Array.from(onlineUsers.entries())
                  .find(([userId, _]) => userId === recipientId);
                
                if (recipient) {
                  const recipientSocket = io.sockets.sockets.get(recipient[1].socketId);
                  if (recipientSocket) {
                    recipientSocket.emit('chat:message', chatMessage);
                  }
                }
              }
              break;
          }
        } else {
          socket.emit('chat:error', { message: result.message || '메시지 전송 실패' });
        }

      } catch (error) {
        console.error('채팅 메시지 전송 오류:', error);
        socket.emit('chat:error', { message: '서버 오류가 발생했습니다.' });
      }
    });

    // 개인 메시지 전송
    socket.on('chat:private', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('chat:error', { message: '인증되지 않은 사용자입니다.' });
          return;
        }

        const { recipientId, message } = data;

        if (!recipientId || !message) {
          socket.emit('chat:error', { message: '수신자 ID와 메시지가 필요합니다.' });
          return;
        }

        const result = await ChatModel.saveMessage(
          socket.user.id,
          message.trim(),
          'private',
          undefined,
          recipientId
        );

        if (result.success) {
          const chatMessage = result.data!;
          
          // 발신자에게 확인 메시지
          socket.emit('chat:private', chatMessage);
          
          // 수신자에게 메시지 전송
          const recipient = Array.from(onlineUsers.entries())
            .find(([userId, _]) => userId === recipientId);
          
          if (recipient) {
            const recipientSocket = io.sockets.sockets.get(recipient[1].socketId);
            if (recipientSocket) {
              recipientSocket.emit('chat:private', chatMessage);
            }
          }
        } else {
          socket.emit('chat:error', { message: result.message || '개인 메시지 전송 실패' });
        }

      } catch (error) {
        console.error('개인 메시지 전송 오류:', error);
        socket.emit('chat:error', { message: '서버 오류가 발생했습니다.' });
      }
    });

    // 채팅 방 참여
    socket.on('chat:join', (data) => {
      const { roomName } = data;
      
      if (!roomName) {
        socket.emit('chat:error', { message: '방 이름이 필요합니다.' });
        return;
      }

      socket.join(roomName);
      
      // 채팅 룸에 소켓 추가
      if (!chatRooms.has(roomName)) {
        chatRooms.set(roomName, new Set());
      }
      chatRooms.get(roomName)!.add(socket.id);

      console.log(`${socket.user?.username}이 ${roomName} 채팅방에 참여했습니다.`);
    });

    // 채팅 방 나가기
    socket.on('chat:leave', (data) => {
      const { roomName } = data;
      
      if (!roomName) return;

      socket.leave(roomName);
      
      // 채팅 룸에서 소켓 제거
      const room = chatRooms.get(roomName);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          chatRooms.delete(roomName);
        }
      }

      console.log(`${socket.user?.username}이 ${roomName} 채팅방에서 나갔습니다.`);
    });

    // 타이핑 상태 알림
    socket.on('chat:typing', (data) => {
      if (!socket.user) return;

      const { channelType = 'global', battleId, recipientId } = data;
      
      const typingData = {
        userId: socket.user.id,
        username: socket.user.username,
        channelType,
        battleId,
        recipientId
      };

      // 채널 타입에 따라 타이핑 상태 브로드캐스트
      switch (channelType) {
        case 'global':
          socket.to('global-chat').emit('chat:typing', typingData);
          break;
          
        case 'battle':
          if (battleId) {
            socket.to(`battle-${battleId}`).emit('chat:typing', typingData);
          }
          break;
          
        case 'private':
          if (recipientId) {
            const recipient = Array.from(onlineUsers.entries())
              .find(([userId, _]) => userId === recipientId);
            
            if (recipient) {
              const recipientSocket = io.sockets.sockets.get(recipient[1].socketId);
              if (recipientSocket) {
                recipientSocket.emit('chat:typing', typingData);
              }
            }
          }
          break;
      }
    });

    // 타이핑 중지
    socket.on('chat:stop-typing', (data) => {
      if (!socket.user) return;

      const { channelType = 'global', battleId, recipientId } = data;
      
      const stopTypingData = {
        userId: socket.user.id,
        username: socket.user.username,
        channelType,
        battleId,
        recipientId
      };

      // 채널 타입에 따라 타이핑 중지 브로드캐스트
      switch (channelType) {
        case 'global':
          socket.to('global-chat').emit('chat:stop-typing', stopTypingData);
          break;
          
        case 'battle':
          if (battleId) {
            socket.to(`battle-${battleId}`).emit('chat:stop-typing', stopTypingData);
          }
          break;
          
        case 'private':
          if (recipientId) {
            const recipient = Array.from(onlineUsers.entries())
              .find(([userId, _]) => userId === recipientId);
            
            if (recipient) {
              const recipientSocket = io.sockets.sockets.get(recipient[1].socketId);
              if (recipientSocket) {
                recipientSocket.emit('chat:stop-typing', stopTypingData);
              }
            }
          }
          break;
      }
    });

    // 연결 해제 처리
    socket.on('disconnect', () => {
      console.log(`채팅 사용자 연결 해제: ${socket.user?.username}`);
      
      if (socket.user) {
        // 온라인 사용자에서 제거
        onlineUsers.delete(socket.user.id);
        
        // 시스템 메시지 - 사용자 퇴장
        ChatModel.saveSystemMessage(`${socket.user.username}님이 퇴장했습니다.`, undefined, 'global')
          .then(result => {
            if (result.success) {
              io.to('global-chat').emit('chat:message', {
                ...result.data!,
                sender_name: 'System'
              });
            }
          });
        
        // 온라인 사용자 목록 업데이트 브로드캐스트
        broadcastOnlineUsers(io);
      }

      // 채팅 룸에서 제거
      for (const [roomName, room] of chatRooms.entries()) {
        if (room.has(socket.id)) {
          room.delete(socket.id);
          if (room.size === 0) {
            chatRooms.delete(roomName);
          }
        }
      }
    });
  });
}

// 온라인 사용자 목록 브로드캐스트
function broadcastOnlineUsers(io: Server) {
  const users = Array.from(onlineUsers.entries()).map(([userId, userInfo]) => ({
    id: userId,
    username: userInfo.username,
    joinedAt: userInfo.joinedAt,
    lastActivity: userInfo.lastActivity
  }));

  io.to('global-chat').emit('chat:online-users', users);
}

// 채팅 통계
export function getChatStats() {
  return {
    onlineUsers: onlineUsers.size,
    activeRooms: chatRooms.size,
    users: Array.from(onlineUsers.entries()).map(([userId, userInfo]) => ({
      id: userId,
      username: userInfo.username,
      joinedAt: userInfo.joinedAt,
      lastActivity: userInfo.lastActivity
    })),
    rooms: Array.from(chatRooms.entries()).map(([roomName, socketIds]) => ({
      name: roomName,
      userCount: socketIds.size
    }))
  };
}