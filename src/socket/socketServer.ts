import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ChatRoomService } from '../services/chat/chatRoomService';
import { MessageService } from '../services/chat/messageService';
import { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  InterServerEvents, 
  SocketData,
  SocketUser 
} from '../types/chat';
import logger from "../utils/logger";
import { log } from 'console';


export class ChatSocketServer {
  private io: SocketServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private chatRoomService: ChatRoomService;
  private messageService: MessageService;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST"]
      }
    });

    this.chatRoomService = new ChatRoomService();
    this.messageService = new MessageService();
    this.setupSocketEvents();
  }

  private setupSocketEvents() {
    this.io.on('connection', (socket) => {
      logger.info(`🔌 Socket connected: ${socket.id}`);

      socket.use((packet, next) => {
        if (!socket.data.user) {
          return next(new Error('Authentication required'));
        }
        next();
      });

      socket.on('joinRoom', async (roomId) => {
        try {
          const user = socket.data.user;
          if (!user) return;

          const chatRoom = await this.chatRoomService.getChatRoom(roomId, user.userId);
          if (!chatRoom) {
            socket.emit('error', '채팅방을 찾을 수 없습니다.');
            return;
          }

          await socket.join(roomId);
          socket.to(roomId).emit('userJoined', user, roomId);
          
          logger.info(`👤 User ${user.username} joined room ${roomId}`);
        } catch (error: any) {
          socket.emit('error', error.message);
        }
      });

      socket.on('leaveRoom', async (roomId) => {
        try {
          const user = socket.data.user;
          if (!user) return;

          await socket.leave(roomId);
          socket.to(roomId).emit('userLeft', user, roomId);
          
          logger.info(`👤 User ${user.username} left room ${roomId}`);
        } catch (error: any) {
          socket.emit('error', error.message);
        }
      });

      socket.on('sendMessage', async (roomId, messageData) => {
        try {
          const user = socket.data.user;
          if (!user) return;

          const message = await this.messageService.createMessage(
            roomId, 
            user.userId, 
            messageData
          );

          this.io.to(roomId).emit('message', message);
          
          logger.info(`💬 Message sent in room ${roomId} by ${user.username}`);
        } catch (error: any) {
          socket.emit('error', error.message);
        }
      });

      socket.on('typing', (roomId) => {
        const user = socket.data.user;
        if (!user) return;
        socket.to(roomId).emit('typing', user.userId, user.username, roomId);
      });

      socket.on('stopTyping', (roomId) => {
        const user = socket.data.user;
        if (!user) return;
        socket.to(roomId).emit('stopTyping', user.userId, roomId);
      });

      socket.on('disconnect', (reason) => {
        logger.info(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);
      });
    });
  }

  public authenticateSocket(socket: any, sessionData: any) {
    if (sessionData && sessionData.user) {
      socket.data.user = {
        userId: sessionData.user.userId,
        username: sessionData.user.username,
        email: sessionData.user.email
      } as SocketUser;
      return true;
    }
    return false;
  }

  public getIO() {
    return this.io;
  }
}