import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import session from 'express-session';
import { ChatRoomService } from '../services/chat/chatRoomService';
import { MessageService } from '../services/chat/messageService';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  SocketUser,
} from '../types/chat';
import logger from '../utils/logger/logger';
import { pubClient, subClient } from '../config/redis/socketRedisClient';
import { env, isProduction } from '../config/env/env';
import { SocketEvents } from './events';
import { authenticateSocketConnection } from './middleware/sessionAuth';

interface SessionData {
  user?: Partial<SocketUser>;
}

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export class ChatSocketServer {
  private io: SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
  private chatRoomService: ChatRoomService;
  private messageService: MessageService;

  constructor(
    httpServer: HttpServer,
    sessionMiddleware: ReturnType<typeof session>,
  ) {
    // CORS 허용 도메인 결정: 프로덕션은 FRONTEND_URL만, 개발은 CORS_ALLOWED_ORIGINS
    const allowedOrigins = isProduction()
      ? [env.FRONTEND_URL]
      : env.CORS_ALLOWED_ORIGINS;

    this.io = new SocketServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Origin이 없는 경우 (서버 간 통신)
          if (!origin) {
            return callback(null, true);
          }

          // 허용된 도메인인지 확인
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            logger.warn(
              `🚫 Socket.IO CORS blocked request from origin: ${origin}`,
            );
            callback(new Error('Not allowed by Socket.IO CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST'],
      },
      // ⚠️ SECURITY: WebSocket 핸드셰이크 전 인증 체크 (DoS 방지)
      allowRequest: (req, callback) => {
        void authenticateSocketConnection(req, callback);
      },
    });

    // Redis adapter 설정 (수평 확장 지원)
    this.setupRedisAdapter();

    // Express 세션 미들웨어를 Socket.IO에 연결
    this.setupSessionMiddleware(sessionMiddleware);

    this.chatRoomService = new ChatRoomService();
    this.messageService = new MessageService();
    this.setupSocketEvents();
  }

  /**
   * Redis adapter 설정
   * 여러 서버 인스턴스 간 Socket.IO 이벤트 동기화
   */
  private setupRedisAdapter() {
    try {
      this.io.adapter(createAdapter(pubClient, subClient));
      logger.info(
        '✅ Socket.IO Redis adapter enabled - Horizontal scaling ready',
      );
    } catch (error) {
      logger.warn(
        '⚠️ Failed to setup Redis adapter. Running in single-server mode.',
        { error },
      );
    }
  }

  /**
   * Express 세션을 Socket.IO에 연결
   * Socket.IO connection이 Express 세션에 접근할 수 있도록 설정
   */
  private setupSessionMiddleware(
    sessionMiddleware: ReturnType<typeof session>,
  ) {
    // Socket.IO의 handshake 과정에서 세션 미들웨어 적용
    this.io.engine.use(sessionMiddleware);

    // 연결 시 세션에서 사용자 정보 추출
    this.io.use((socket: TypedSocket, next) => {
      const req = socket.request as unknown as Express.Request & {
        session?: SessionData;
      };
      const session = req.session;

      if (session?.user) {
        // 세션에서 user 정보를 socket.data.user에 설정
        const { userId, username, email } = session.user;
        if (userId && username && email) {
          socket.data.user = {
            userId,
            username,
            email,
          };
          logger.info(`🔐 Socket.IO authenticated: ${username} (${socket.id})`);
          next();
          return;
        }
      }

      logger.warn(
        `🚫 Socket.IO authentication failed: No session (${socket.id})`,
      );
      next(new Error('Authentication required'));
    });

    logger.info('✅ Socket.IO session middleware configured');
  }

  private setupSocketEvents() {
    this.io.on(SocketEvents.CONNECTION, (socket) => {
      const user = socket.data.user;
      logger.info(
        `🔌 Socket connected: ${socket.id} (User: ${user?.username || 'Unknown'})`,
      );

      socket.on(SocketEvents.JOIN_ROOM, async (roomId) => {
        try {
          const user = socket.data.user;
          if (!user) return;

          const chatRoom = await this.chatRoomService.getChatRoom(
            roomId,
            user.userId,
          );
          if (!chatRoom) {
            socket.emit(SocketEvents.ERROR, '채팅방을 찾을 수 없습니다.');
            return;
          }

          await socket.join(roomId);
          socket.to(roomId).emit(SocketEvents.USER_JOINED, user, roomId);

          logger.info(`👤 User ${user.username} joined room ${roomId}`);
        } catch (error: unknown) {
          socket.emit(SocketEvents.ERROR, (error as Error).message);
        }
      });

      socket.on(SocketEvents.LEAVE_ROOM, async (roomId) => {
        try {
          const user = socket.data.user;
          if (!user) return;

          await socket.leave(roomId);
          socket.to(roomId).emit(SocketEvents.USER_LEFT, user, roomId);

          logger.info(`👤 User ${user.username} left room ${roomId}`);
        } catch (error: unknown) {
          socket.emit(SocketEvents.ERROR, (error as Error).message);
        }
      });

      socket.on(SocketEvents.SEND_MESSAGE, async (roomId, messageData) => {
        try {
          const user = socket.data.user;
          if (!user) return;

          const message = await this.messageService.createMessage(
            roomId,
            user.userId,
            messageData,
          );

          this.io.to(roomId).emit(SocketEvents.MESSAGE, message);

          logger.info(`💬 Message sent in room ${roomId} by ${user.username}`);
        } catch (error: unknown) {
          socket.emit(SocketEvents.ERROR, (error as Error).message);
        }
      });

      socket.on(SocketEvents.TYPING, (roomId) => {
        const user = socket.data.user;
        if (!user) return;
        socket
          .to(roomId)
          .emit(SocketEvents.TYPING, user.userId, user.username, roomId);
      });

      socket.on(SocketEvents.STOP_TYPING, (roomId) => {
        const user = socket.data.user;
        if (!user) return;
        socket.to(roomId).emit(SocketEvents.STOP_TYPING, user.userId, roomId);
      });

      socket.on(SocketEvents.DISCONNECT, async (reason) => {
        logger.info(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);
        const user = socket.data.user;
        if (!user) return;

        const roomIds = Array.from(socket.rooms).filter(
          (roomId) => roomId !== socket.id,
        );

        await Promise.all(
          roomIds.map(async (roomId) => {
            try {
              await this.chatRoomService.leaveChatRoom(roomId, user.userId);
              socket.to(roomId).emit(SocketEvents.USER_LEFT, user, roomId);
              logger.info(`👤 User ${user.username} left room ${roomId}`);
            } catch (error: unknown) {
              logger.error(
                `Error leaving room ${roomId}: ${(error as Error).message}`,
              );
            }
          }),
        );
      });
    });
  }

  public authenticateSocket(
    socket: TypedSocket,
    sessionData: SessionData,
  ): boolean {
    const user = sessionData?.user;
    if (
      user &&
      typeof user.userId === 'string' &&
      typeof user.username === 'string' &&
      typeof user.email === 'string'
    ) {
      socket.data.user = {
        userId: user.userId,
        username: user.username,
        email: user.email,
      };
      return true;
    }
    return false;
  }

  public getIO() {
    return this.io;
  }
}
