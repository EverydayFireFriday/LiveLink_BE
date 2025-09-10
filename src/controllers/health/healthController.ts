import express from 'express';
import { loadavg } from 'os';
import { redisClient } from '../../app';
import { getConcertModel } from '../../models/concert/concert';
import { swaggerSpec } from '../../config/swagger';
import logger from '../../utils/logger/logger';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    server?: {
      status: string;
      uptime: string;
      memory: {
        used: string;
        total: string;
        external: string;
      };
      cpu: {
        loadAverage: number[] | string;
      };
      nodejs: string;
    };
    redis?: {
      status: string;
      connected: boolean;
      responseTime?: string;
      error?: string;
    };
    databases?: {
      [key: string]: {
        status: string;
        responseTime?: string;
        totalConcerts?: number;
        collections?: string | string[];
        error?: string;
      };
    };
  };
  responseTime: string;
}

interface DatabaseHealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  databases: {
    [key: string]: {
      status: string;
      responseTime?: string;
      totalConcerts?: number;
      upcomingConcerts?: number;
      collections?: string[];
      lastChecked: string;
      error?: string;
    };
  };
  responseTime?: string;
}

export const getSwaggerJson = (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
};

export const basicHealthCheck = (
  req: express.Request,
  res: express.Response,
) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  res.status(200).json({
    status: 'healthy',
    message: '서버가 정상적으로 작동 중입니다.',
    timestamp: new Date().toISOString(),
    uptime: `${hours}시간 ${minutes}분 ${seconds}초`,
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
};

export const detailedHealthCheck = async (
  req: express.Request,
  res: express.Response,
) => {
  const startTime = Date.now();
  const healthData: HealthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    responseTime: '0ms',
  };

  let overallHealthy = true;

  try {
    // 1. 서버 상태
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    healthData.services.server = {
      status: 'healthy',
      uptime: `${Math.floor(uptime)}초`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      cpu: {
        loadAverage: process.platform !== 'win32' ? loadavg() : 'N/A (Windows)',
      },
      nodejs: process.version,
    };

    // 2. Redis 상태 확인
    try {
      const redisConnected = redisClient?.isOpen || false;
      if (redisConnected) {
        const pingStart = Date.now();
        await redisClient.ping();
        const pingTime = Date.now() - pingStart;

        healthData.services.redis = {
          status: 'healthy',
          connected: true,
          responseTime: `${pingTime}ms`,
        };
      } else {
        throw new Error('Redis not connected');
      }
    } catch (error) {
      healthData.services.redis = {
        status: 'unhealthy',
        connected: false,
        error:
          error instanceof Error ? error.message : 'Redis connection failed',
      };
      overallHealthy = false;
    }

    // 3. 데이터베이스 상태 확인
    healthData.services.databases = {};

    // Concert DB 확인
    try {
      const Concert = getConcertModel();
      const dbStart = Date.now();
      const stats = await Concert.getStats();
      const dbTime = Date.now() - dbStart;

      healthData.services.databases.concert = {
        status: 'healthy',
        responseTime: `${dbTime}ms`,
        totalConcerts: stats.total,
        collections: 'concerts',
      };
    } catch (error) {
      healthData.services.databases.concert = {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : 'Concert DB connection failed',
      };
      overallHealthy = false;
    }

    // 4. 전체 상태 결정
    healthData.status = overallHealthy ? 'healthy' : 'degraded';
    healthData.responseTime = `${Date.now() - startTime}ms`;

    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: `${Date.now() - startTime}ms`,
    });
  }
};

export const redisHealthCheck = async (
  req: express.Request,
  res: express.Response,
) => {
  const startTime = Date.now();

  try {
    if (!redisClient?.isOpen) {
      throw new Error('Redis client not connected');
    }

    const pingStart = Date.now();
    const pong = await redisClient.ping();
    const responseTime = Date.now() - pingStart;

    res.status(200).json({
      status: 'healthy',
      connected: true,
      responseTime: `${responseTime}ms`,
      response: pong,
      timestamp: new Date().toISOString(),
      totalResponseTime: `${Date.now() - startTime}ms`,
    });
  } catch (error) {
    logger.error('Redis health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      connected: false,
      error:
        error instanceof Error ? error.message : 'Redis health check failed',
      timestamp: new Date().toISOString(),
      totalResponseTime: `${Date.now() - startTime}ms`,
    });
  }
};

export const databaseHealthCheck = async (
  req: express.Request,
  res: express.Response,
) => {
  const startTime = Date.now();
  const healthData: DatabaseHealthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    databases: {},
  };

  let overallHealthy = true;

  try {
    // Concert DB 확인
    try {
      const Concert = getConcertModel();
      const dbStart = Date.now();
      const stats = await Concert.getStats();
      const dbTime = Date.now() - dbStart;

      healthData.databases.concert = {
        status: 'healthy',
        responseTime: `${dbTime}ms`,
        totalConcerts: stats.total,
        upcomingConcerts: stats.upcoming,
        collections: ['concerts'],
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      healthData.databases.concert = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Concert DB failed',
        lastChecked: new Date().toISOString(),
      };
      overallHealthy = false;
    }

    // 전체 상태 결정
    healthData.status = overallHealthy ? 'healthy' : 'degraded';
    healthData.responseTime = `${Date.now() - startTime}ms`;

    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error('Database health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error:
        error instanceof Error ? error.message : 'Database health check failed',
      responseTime: `${Date.now() - startTime}ms`,
    });
  }
};

export const readinessCheck = async (
  req: express.Request,
  res: express.Response,
) => {
  try {
    // 필수 서비스들 체크
    const checks = [];

    // Redis 체크
    if (redisClient?.isOpen) {
      await redisClient.ping();
      checks.push({ service: 'redis', status: 'ready' });
    } else {
      throw new Error('Redis not ready');
    }

    // Concert DB 체크
    const Concert = getConcertModel();
    await Concert.getStats();
    checks.push({ service: 'concert_db', status: 'ready' });

    res.status(200).json({
      ready: true,
      message: '서비스가 트래픽을 받을 준비가 되었습니다.',
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      message: '서비스가 아직 준비되지 않았습니다.',
      error: error instanceof Error ? error.message : 'Readiness check failed',
      timestamp: new Date().toISOString(),
    });
  }
};

export const livenessCheck = (req: express.Request, res: express.Response) => {
  // 기본적인 생존 체크 - 서버가 응답할 수 있는지만 확인
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

  // 메모리 사용량이 과도하게 높으면 문제로 판단
  if (heapUsedMB > 1024) {
    // 1GB 이상
    return res.status(503).json({
      alive: false,
      message: '높은 메모리 사용량으로 인한 서비스 위험 상태',
      memoryUsage: `${Math.round(heapUsedMB)}MB`,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(200).json({
    alive: true,
    message: '서비스가 정상적으로 작동 중입니다.',
    uptime: `${Math.floor(process.uptime())}초`,
    memoryUsage: `${Math.round(heapUsedMB)}MB`,
    timestamp: new Date().toISOString(),
  });
};
