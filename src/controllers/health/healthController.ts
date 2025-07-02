import express from "express";
import { redisClient } from "../../index";
import { getConcertModel } from "../../models/concert/concert";

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 기본 서버 상태 확인
 *     description: 서버가 정상적으로 실행 중인지 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 서버 정상 작동
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 message:
 *                   type: string
 *                   example: "서버가 정상적으로 작동 중입니다."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: string
 *                   example: "2시간 30분 45초"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
export const basicHealthCheck = (
  req: express.Request,
  res: express.Response
) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  res.status(200).json({
    status: "healthy",
    message: "서버가 정상적으로 작동 중입니다.",
    timestamp: new Date().toISOString(),
    uptime: `${hours}시간 ${minutes}분 ${seconds}초`,
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
};

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: 상세 서버 상태 확인
 *     description: 서버, 데이터베이스, Redis 등 모든 서비스의 상태를 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 모든 서비스 정상
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 services:
 *                   type: object
 *                   properties:
 *                     server:
 *                       type: object
 *                       properties:
 *                         status: { type: "string", example: "healthy" }
 *                         uptime: { type: "string" }
 *                         memory: { type: "object" }
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status: { type: "string", example: "healthy" }
 *                         connected: { type: "boolean" }
 *                     databases:
 *                       type: object
 *                       properties:
 *                         concert: { type: "object" }
 *       503:
 *         description: 일부 서비스 문제 발생
 */
export const detailedHealthCheck = async (
  req: express.Request,
  res: express.Response
) => {
  const startTime = Date.now();
  const healthData: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {},
    responseTime: 0,
  };

  let overallHealthy = true;

  try {
    // 1. 서버 상태
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    healthData.services.server = {
      status: "healthy",
      uptime: `${Math.floor(uptime)}초`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      cpu: {
        loadAverage:
          process.platform !== "win32"
            ? require("os").loadavg()
            : "N/A (Windows)",
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
          status: "healthy",
          connected: true,
          responseTime: `${pingTime}ms`,
        };
      } else {
        throw new Error("Redis not connected");
      }
    } catch (error) {
      healthData.services.redis = {
        status: "unhealthy",
        connected: false,
        error:
          error instanceof Error ? error.message : "Redis connection failed",
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
        status: "healthy",
        responseTime: `${dbTime}ms`,
        totalConcerts: stats.total,
        collections: "concerts",
      };
    } catch (error) {
      healthData.services.databases.concert = {
        status: "unhealthy",
        error:
          error instanceof Error
            ? error.message
            : "Concert DB connection failed",
      };
      overallHealthy = false;
    }

    // 4. 전체 상태 결정
    healthData.status = overallHealthy ? "healthy" : "degraded";
    healthData.responseTime = `${Date.now() - startTime}ms`;

    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Health check failed",
      responseTime: `${Date.now() - startTime}ms`,
    });
  }
};

/**
 * @swagger
 * /health/redis:
 *   get:
 *     summary: Redis 연결 상태 확인
 *     description: Redis 서버의 연결 상태와 성능을 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Redis 정상 작동
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 connected:
 *                   type: boolean
 *                   example: true
 *                 responseTime:
 *                   type: string
 *                   example: "2ms"
 *       503:
 *         description: Redis 연결 실패
 */
export const redisHealthCheck = async (
  req: express.Request,
  res: express.Response
) => {
  const startTime = Date.now();

  try {
    if (!redisClient?.isOpen) {
      throw new Error("Redis client not connected");
    }

    const pingStart = Date.now();
    const pong = await redisClient.ping();
    const responseTime = Date.now() - pingStart;

    res.status(200).json({
      status: "healthy",
      connected: true,
      responseTime: `${responseTime}ms`,
      response: pong,
      timestamp: new Date().toISOString(),
      totalResponseTime: `${Date.now() - startTime}ms`,
    });
  } catch (error) {
    console.error("Redis health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      connected: false,
      error:
        error instanceof Error ? error.message : "Redis health check failed",
      timestamp: new Date().toISOString(),
      totalResponseTime: `${Date.now() - startTime}ms`,
    });
  }
};

/**
 * @swagger
 * /health/database:
 *   get:
 *     summary: 데이터베이스 연결 상태 확인
 *     description: MongoDB 데이터베이스의 연결 상태와 성능을 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 데이터베이스 정상 작동
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 databases:
 *                   type: object
 *                   properties:
 *                     concert:
 *                       type: object
 *                       properties:
 *                         status: { type: "string", example: "healthy" }
 *                         responseTime: { type: "string", example: "15ms" }
 *                         totalConcerts: { type: "number", example: 1250 }
 *       503:
 *         description: 데이터베이스 연결 실패
 */
export const databaseHealthCheck = async (
  req: express.Request,
  res: express.Response
) => {
  const startTime = Date.now();
  const healthData: any = {
    status: "healthy",
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
        status: "healthy",
        responseTime: `${dbTime}ms`,
        totalConcerts: stats.total,
        upcomingConcerts: stats.upcoming,
        collections: ["concerts"],
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      healthData.databases.concert = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Concert DB failed",
        lastChecked: new Date().toISOString(),
      };
      overallHealthy = false;
    }

    // 전체 상태 결정
    healthData.status = overallHealthy ? "healthy" : "degraded";
    healthData.responseTime = `${Date.now() - startTime}ms`;

    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error("Database health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error:
        error instanceof Error ? error.message : "Database health check failed",
      responseTime: `${Date.now() - startTime}ms`,
    });
  }
};

/**
 * @swagger
 * /health/readiness:
 *   get:
 *     summary: 서비스 준비 상태 확인 (Kubernetes Readiness Probe)
 *     description: 서비스가 트래픽을 받을 준비가 되었는지 확인합니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 서비스 준비 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "서비스가 트래픽을 받을 준비가 되었습니다."
 *       503:
 *         description: 서비스 준비 미완료
 */
export const readinessCheck = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // 필수 서비스들 체크
    const checks = [];

    // Redis 체크
    if (redisClient?.isOpen) {
      await redisClient.ping();
      checks.push({ service: "redis", status: "ready" });
    } else {
      throw new Error("Redis not ready");
    }

    // Concert DB 체크
    const Concert = getConcertModel();
    await Concert.getStats();
    checks.push({ service: "concert_db", status: "ready" });

    res.status(200).json({
      ready: true,
      message: "서비스가 트래픽을 받을 준비가 되었습니다.",
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      message: "서비스가 아직 준비되지 않았습니다.",
      error: error instanceof Error ? error.message : "Readiness check failed",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /health/liveness:
 *   get:
 *     summary: 서비스 생존 상태 확인 (Kubernetes Liveness Probe)
 *     description: 서비스가 살아있는지 확인합니다. 실패 시 재시작이 필요할 수 있습니다.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: 서비스 정상 작동
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "서비스가 정상적으로 작동 중입니다."
 *       503:
 *         description: 서비스 문제 발생
 */
export const livenessCheck = (req: express.Request, res: express.Response) => {
  // 기본적인 생존 체크 - 서버가 응답할 수 있는지만 확인
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

  // 메모리 사용량이 과도하게 높으면 문제로 판단
  if (heapUsedMB > 1024) {
    // 1GB 이상
    return res.status(503).json({
      alive: false,
      message: "높은 메모리 사용량으로 인한 서비스 위험 상태",
      memoryUsage: `${Math.round(heapUsedMB)}MB`,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(200).json({
    alive: true,
    message: "서비스가 정상적으로 작동 중입니다.",
    uptime: `${Math.floor(process.uptime())}초`,
    memoryUsage: `${Math.round(heapUsedMB)}MB`,
    timestamp: new Date().toISOString(),
  });
};
