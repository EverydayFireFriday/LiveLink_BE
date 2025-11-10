import * as http from 'http';
import logger from '../../utils/logger/logger';
import { ChatSocketServer } from '../../socket';
import { disconnectDatabases } from '../../config/database/initializer';
import { disconnectRedis } from '../../config/redis/redisClient';
import { disconnectSocketRedis } from '../../config/redis/socketRedisClient';

interface ShutdownState {
  isShuttingDown: boolean;
  activeRequests: number;
}

export const shutdownState: ShutdownState = {
  isShuttingDown: false,
  activeRequests: 0,
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = async (
  signal: string,
  httpServer: http.Server,
  chatSocketServer: ChatSocketServer | null,
): Promise<void> => {
  logger.info(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  // 중복 종료 방지
  if (shutdownState.isShuttingDown) {
    logger.warn('⚠️ Shutdown already in progress, ignoring signal');
    return;
  }

  shutdownState.isShuttingDown = true;
  const shutdownStartTime = Date.now();

  try {
    // 1️⃣ 새로운 요청 거부 시작 (미들웨어에서 처리)
    logger.info('1️⃣ Rejecting new requests...');

    // 2️⃣ Socket.IO 클라이언트에게 종료 알림 전송
    if (chatSocketServer) {
      logger.info('2️⃣ Notifying Socket.IO clients about shutdown...');
      const io = chatSocketServer.getIO();
      io.emit('server:shutdown', {
        message: '서버가 곧 종료됩니다. 재연결을 준비해주세요.',
        reconnectAfter: 5000,
      });

      // 클라이언트가 메시지를 받을 시간 제공 (5초)
      logger.info(
        '⏳ Waiting 5 seconds for clients to receive shutdown notice...',
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // 3️⃣ 진행 중인 요청 완료 대기 (최대 30초)
    logger.info(
      `3️⃣ Waiting for ${shutdownState.activeRequests} active requests to complete (max 30s)...`,
    );
    const requestWaitStart = Date.now();
    const maxWaitTime = 30000; // 30초

    while (
      shutdownState.activeRequests > 0 &&
      Date.now() - requestWaitStart < maxWaitTime
    ) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5초마다 체크
      if (shutdownState.activeRequests > 0) {
        logger.info(
          `⏳ Still waiting... ${shutdownState.activeRequests} active requests remaining`,
        );
      }
    }

    if (shutdownState.activeRequests > 0) {
      logger.warn(
        `⚠️ Force closing with ${shutdownState.activeRequests} active requests after 30s timeout`,
      );
    } else {
      logger.info('✅ All requests completed successfully');
    }

    // 4️⃣ HTTP 서버 종료 (타임아웃 포함)
    if (httpServer.listening) {
      logger.info('4️⃣ Closing HTTP server...');
      await Promise.race([
        new Promise<void>((resolve) => {
          httpServer.close(() => {
            logger.info('✅ HTTP server closed gracefully');
            resolve();
          });
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            logger.warn('⚠️ HTTP server close timeout, forcing shutdown');
            resolve();
          }, 10000); // 10초 타임아웃
        }),
      ]);
    }

    // 5️⃣ Socket.IO 서버 종료
    if (chatSocketServer) {
      logger.info('5️⃣ Closing Socket.IO server...');
      const io = chatSocketServer.getIO();

      // 모든 소켓 연결 강제 종료
      const sockets = await io.fetchSockets();
      sockets.forEach((socket) => socket.disconnect(true));

      await io.close();
      logger.info('✅ Socket.IO server closed');
    }

    // 6️⃣ 데이터베이스 및 스케줄러 종료
    logger.info('6️⃣ Disconnecting databases and stopping schedulers...');
    await disconnectDatabases();

    // 7️⃣ Socket.IO Redis 연결 종료
    logger.info('7️⃣ Disconnecting Socket.IO Redis clients...');
    await disconnectSocketRedis();

    // 8️⃣ Redis 연결 종료
    logger.info('8️⃣ Disconnecting Redis client...');
    await disconnectRedis();

    const shutdownDuration = Date.now() - shutdownStartTime;
    logger.info('🎉 ================================');
    logger.info(`👋 Graceful shutdown completed in ${shutdownDuration}ms`);
    logger.info('🎉 ================================');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Graceful shutdown failed', { error });
    process.exit(1);
  }
};

/**
 * Setup process signal handlers
 */
export const setupShutdownHandlers = (
  httpServer: http.Server,
  chatSocketServer: ChatSocketServer | null,
) => {
  process.on(
    'SIGTERM',
    () => void gracefulShutdown('SIGTERM', httpServer, chatSocketServer),
  );
  process.on(
    'SIGINT',
    () => void gracefulShutdown('SIGINT', httpServer, chatSocketServer),
  );
};

/**
 * Setup global error handlers
 */
export const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', (reason) => {
    logger.error('💥 UnhandledRejection:', { reason });
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('💥 UncaughtException:', { error: err, stack: err?.stack });
    process.exit(1);
  });
};
