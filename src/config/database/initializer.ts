import type { Worker } from 'bullmq';
import logger from '../../utils/logger/logger';
import { dbConnectionGauge } from '../metrics/prometheus';

// 데이터베이스 연결 함수들
import {
  connectDatabase as connectUserDB,
  disconnectDatabase as disconnectUserDB,
} from '../../models/auth/user';
import {
  connectDB as connectConcertDB,
  disconnectDB as disconnectConcertDB,
  initializeConcertModel,
} from '../../utils/database/db';
import { initializeAllArticleModels } from '../../models/article';
import { initializeConcertTestModel } from '../../models/test/test';
import { initializeSetlistModel } from '../../models/setlist/setlist';
import { ReportService } from '../../report/reportService';
import { ConcertStatusScheduler } from '../../services/concert/concertStatusScheduler';
import { SessionCleanupScheduler } from '../../services/auth/sessionCleanupScheduler';
import {
  createNotificationWorker,
  closeNotificationWorker,
} from '../../services/notification/notificationWorker';
import { closeNotificationQueue } from '../queue/notificationQueue';
import { NotificationRecoveryService } from '../../services/notification/notificationRecovery';
import { getNotificationHistoryModel } from '../../models/notification/notificationHistory';
import {
  startTicketNotificationScheduler,
  stopTicketNotificationScheduler,
} from '../../services/notification/ticketNotificationScheduler';
import {
  createTicketNotificationWorker,
  closeTicketNotificationWorker,
} from '../../services/notification/ticketNotificationWorker';
import { closeTicketNotificationQueue } from '../queue/ticketNotificationQueue';
import {
  startConcertStartNotificationScheduler,
  stopConcertStartNotificationScheduler,
} from '../../services/notification/concertStartNotificationScheduler';
import {
  createConcertStartNotificationWorker,
  closeConcertStartNotificationWorker,
} from '../../services/notification/concertStartNotificationWorker';
import { closeConcertStartNotificationQueue } from '../queue/concertStartNotificationQueue';
import { initializeChatModels } from '../../models/chat';
import {
  connectLiveDB,
  disconnectLiveDB,
  isLiveSyncEnabled,
} from '../../utils/database/liveDbConnection';

// 데이터베이스 연결 상태 추적
export interface DatabaseState {
  isUserDBConnected: boolean;
  isConcertDBConnected: boolean;
  isArticleDBConnected: boolean;
  isChatDBConnected: boolean;
  isLiveDBConnected: boolean;
  reportService: ReportService | null;
  concertStatusScheduler: ConcertStatusScheduler | null;
  sessionCleanupScheduler: SessionCleanupScheduler | null;
  notificationWorker: Worker | null;
  ticketNotificationWorker: Worker | null;
  concertStartNotificationWorker: Worker | null;
}

export const databaseState: DatabaseState = {
  isUserDBConnected: false,
  isConcertDBConnected: false,
  isArticleDBConnected: false,
  isChatDBConnected: false,
  isLiveDBConnected: false,
  reportService: null,
  concertStatusScheduler: null,
  sessionCleanupScheduler: null,
  notificationWorker: null,
  ticketNotificationWorker: null,
  concertStartNotificationWorker: null,
};

/**
 * Initialize all databases and related services
 */
export const initializeDatabases = async (): Promise<void> => {
  try {
    logger.info('🔌 Connecting to User Database...');
    await connectUserDB();
    databaseState.isUserDBConnected = true;
    dbConnectionGauge.set({ database: 'user' }, 1);
    logger.info('✅ User Database connected');

    logger.info('🔌 Connecting to Concert Database...');
    const concertDB = await connectConcertDB();
    initializeConcertModel(concertDB);
    initializeConcertTestModel(concertDB);
    initializeSetlistModel(concertDB);
    databaseState.isConcertDBConnected = true;
    dbConnectionGauge.set({ database: 'concert' }, 1);
    logger.info('✅ Concert Database connected and models initialized');

    logger.info('🔌 Initializing Article Database...');
    initializeAllArticleModels(concertDB);
    databaseState.isArticleDBConnected = true;
    dbConnectionGauge.set({ database: 'article' }, 1);
    logger.info('✅ Article Database initialized and models ready');

    // Initialize ReportService
    databaseState.reportService = new ReportService(concertDB);
    logger.info('✅ Report Service initialized');

    logger.info('🔌 Initializing Chat Database...');
    initializeChatModels();
    databaseState.isChatDBConnected = true;
    dbConnectionGauge.set({ database: 'chat' }, 1);
    logger.info('✅ Chat Database initialized and models ready');

    // Initialize Concert Status Scheduler
    logger.info('🔌 Initializing Concert Status Scheduler...');
    databaseState.concertStatusScheduler = new ConcertStatusScheduler(
      concertDB,
    );
    databaseState.concertStatusScheduler.start();
    logger.info('✅ Concert Status Scheduler started');

    // Initialize Session Cleanup Scheduler
    logger.info('🔌 Initializing Session Cleanup Scheduler...');
    databaseState.sessionCleanupScheduler = new SessionCleanupScheduler();
    databaseState.sessionCleanupScheduler.start();
    logger.info('✅ Session Cleanup Scheduler started');

    // Initialize Notification History Model
    logger.info('🔌 Initializing Notification History Model...');
    const userDB = await import('../../utils/database/db').then((m) =>
      m.getDB(),
    );
    getNotificationHistoryModel(userDB);
    logger.info('✅ Notification History Model initialized');

    // Initialize Notification Worker (BullMQ)
    logger.info('🔌 Initializing Notification Worker (BullMQ)...');
    databaseState.notificationWorker = createNotificationWorker();
    logger.info('✅ Notification Worker started');

    // Run notification recovery (restore lost jobs from MongoDB)
    logger.info('🔄 Running notification job recovery...');
    await NotificationRecoveryService.runFullRecovery(concertDB);
    logger.info('✅ Notification recovery completed');

    // Initialize Ticket Notification Worker (BullMQ)
    logger.info('🔌 Initializing Ticket Notification Worker (BullMQ)...');
    databaseState.ticketNotificationWorker = createTicketNotificationWorker();
    logger.info('✅ Ticket Notification Worker started');

    // Start Ticket Notification Scheduler (D-2 scheduler)
    logger.info('🔌 Starting Ticket Notification Scheduler (D-2)...');
    startTicketNotificationScheduler();
    logger.info('✅ Ticket Notification Scheduler started');

    // Initialize Concert Start Notification Worker (BullMQ)
    logger.info(
      '🔌 Initializing Concert Start Notification Worker (BullMQ)...',
    );
    databaseState.concertStartNotificationWorker =
      createConcertStartNotificationWorker();
    logger.info('✅ Concert Start Notification Worker started');

    // Start Concert Notification Scheduler
    logger.info('🔌 Starting Concert Notification Scheduler...');
    startConcertStartNotificationScheduler();
    logger.info('✅ Concert Notification Scheduler started');

    // Initialize Live DB for concert sync (optional)
    if (isLiveSyncEnabled()) {
      logger.info('🔌 Connecting to Live Database for sync...');
      const liveDb = await connectLiveDB();
      if (liveDb) {
        databaseState.isLiveDBConnected = true;
        dbConnectionGauge.set({ database: 'live' }, 1);
        logger.info('✅ Live Database connected for concert sync');
      } else {
        logger.warn('⚠️  Live Database connection failed, sync disabled');
      }
    } else {
      logger.info('ℹ️  Live DB sync is disabled');
    }
  } catch (error) {
    logger.error('❌ Database initialization failed:', { error });
    // Set all database connection gauges to 0 on failure
    dbConnectionGauge.set(
      { database: 'user' },
      databaseState.isUserDBConnected ? 1 : 0,
    );
    dbConnectionGauge.set(
      { database: 'concert' },
      databaseState.isConcertDBConnected ? 1 : 0,
    );
    dbConnectionGauge.set(
      { database: 'article' },
      databaseState.isArticleDBConnected ? 1 : 0,
    );
    dbConnectionGauge.set(
      { database: 'chat' },
      databaseState.isChatDBConnected ? 1 : 0,
    );
    dbConnectionGauge.set(
      { database: 'live' },
      databaseState.isLiveDBConnected ? 1 : 0,
    );
    throw error;
  }
};

/**
 * Disconnect all databases and stop schedulers
 */
export const disconnectDatabases = async (): Promise<void> => {
  // Stop Concert Status Scheduler
  if (databaseState.concertStatusScheduler) {
    logger.info('Stopping Concert Status Scheduler...');
    databaseState.concertStatusScheduler.stop();
    databaseState.concertStatusScheduler = null;
    logger.info('✅ Concert Status Scheduler stopped');
  }

  // Stop Session Cleanup Scheduler
  if (databaseState.sessionCleanupScheduler) {
    logger.info('Stopping Session Cleanup Scheduler...');
    databaseState.sessionCleanupScheduler.stop();
    databaseState.sessionCleanupScheduler = null;
    logger.info('✅ Session Cleanup Scheduler stopped');
  }

  // Stop Notification Worker (BullMQ)
  if (databaseState.notificationWorker) {
    logger.info('Stopping Notification Worker...');
    await closeNotificationWorker(databaseState.notificationWorker);
    databaseState.notificationWorker = null;
    logger.info('✅ Notification Worker stopped');
  }

  // Close Notification Queue
  logger.info('Closing Notification Queue...');
  await closeNotificationQueue();
  logger.info('✅ Notification Queue closed');

  // Stop Ticket Notification Scheduler
  logger.info('Stopping Ticket Notification Scheduler...');
  stopTicketNotificationScheduler();
  logger.info('✅ Ticket Notification Scheduler stopped');

  // Stop Ticket Notification Worker (BullMQ)
  if (databaseState.ticketNotificationWorker) {
    logger.info('Stopping Ticket Notification Worker...');
    await closeTicketNotificationWorker();
    databaseState.ticketNotificationWorker = null;
    logger.info('✅ Ticket Notification Worker stopped');
  }

  // Close Ticket Notification Queue
  logger.info('Closing Ticket Notification Queue...');
  await closeTicketNotificationQueue();
  logger.info('✅ Ticket Notification Queue closed');

  // Stop Concert Notification Scheduler
  logger.info('Stopping Concert Notification Scheduler...');
  stopConcertStartNotificationScheduler();
  logger.info('✅ Concert Notification Scheduler stopped');

  // Stop Concert Start Notification Worker
  if (databaseState.concertStartNotificationWorker) {
    logger.info('Stopping Concert Start Notification Worker...');
    await closeConcertStartNotificationWorker();
    databaseState.concertStartNotificationWorker = null;
    logger.info('✅ Concert Start Notification Worker stopped');
  }

  // Close Concert Start Notification Queue
  logger.info('Closing Concert Start Notification Queue...');
  await closeConcertStartNotificationQueue();
  logger.info('✅ Concert Start Notification Queue closed');

  // Disconnect MongoDB
  logger.info('Disconnecting MongoDB...');
  await disconnectUserDB();
  logger.info('✅ User MongoDB disconnected');

  await disconnectConcertDB();
  logger.info('✅ Concert, Article, and Chat MongoDB disconnected');

  // Disconnect Live DB
  if (databaseState.isLiveDBConnected) {
    logger.info('Disconnecting Live MongoDB...');
    await disconnectLiveDB();
    databaseState.isLiveDBConnected = false;
    dbConnectionGauge.set({ database: 'live' }, 0);
    logger.info('✅ Live MongoDB disconnected');
  }
};
