import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { authenticateSocket } from '../middlewares/auth/socketAuthMiddleware';
import { ChatHandler } from './handlers/chatHandler';

export class SocketServer {
  private io: Server;

  constructor(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupRedisAdapter();
    this.setupAuthentication();
    this.setupConnectionHandler();
  }

  private async setupRedisAdapter() {
    try {
      const pubClient = createClient({ 
        url: process.env.REDIS_URL || "redis://localhost:6379" 
      });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);
      
      this.io.adapter(createAdapter(pubClient, subClient));
      console.log('Redis adapter connected for Socket.io');
    } catch (error) {
      console.error('Redis adapter setup failed:', error);
    }
  }

  private setupAuthentication() {
    this.io.use(authenticateSocket);
  }

  private setupConnectionHandler() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${(socket as any).userName} (${socket.id})`);

      // 채팅 핸들러 초기화
      new ChatHandler(this.io, socket);

      socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${(socket as any).userName} (${reason})`);
      });
    });
  }

  public getIO(): Server {
    return this.io;
  }
}