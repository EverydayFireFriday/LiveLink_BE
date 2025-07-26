import express from "express";
import {
import logger from "../../utils/logger";
import fs from "fs";
import path from "path";
  basicHealthCheck,
  detailedHealthCheck,
  redisHealthCheck,
  databaseHealthCheck,
  readinessCheck,
  livenessCheck,
} from "../../controllers/health/healthController";
import { requireAdmin } from "../../middlewares/auth/adminMiddleware";

const router = express.Router();

/**
 * @route GET /health
 * @desc 기본 서버 상태 확인
 * @access Admin only
 */
router.get("/", requireAdmin, basicHealthCheck);

/**
 * @route GET /health/detailed
 * @desc 상세 서버 상태 확인 (모든 서비스)
 * @access Admin only
 */
router.get("/detailed", requireAdmin, detailedHealthCheck);

/**
 * @route GET /health/redis
 * @desc Redis 연결 상태 확인
 * @access Admin only
 */
router.get("/redis", requireAdmin, redisHealthCheck);

/**
 * @route GET /health/database
 * @desc 데이터베이스 연결 상태 확인
 * @access Admin only
 */
router.get("/database", requireAdmin, databaseHealthCheck);

/**
 * @route GET /health/readiness
 * @desc 서비스 준비 상태 확인 (Kubernetes Readiness Probe)
 * @access Admin only
 */
router.get("/readiness", requireAdmin, readinessCheck);

/**
 * @route GET /health/liveness
 * @desc 서비스 생존 상태 확인 (Kubernetes Liveness Probe)
 * @access Admin only
 */
router.get("/liveness", requireAdmin, livenessCheck);


// 📊 로깅 시스템 상세 상태
router.get("/logs", async (req: express.Request, res: express.Response) => {
  try {
    // 로깅 시스템 상태 확인
    const logsDir = path.join(process.cwd(), 'logs');
    if (fs.existsSync(logsDir)) {
      healthStatus.services.logging = "OK";
      
      // 최근 에러 로그 확인
      const errorLogPath = path.join(logsDir, 'error.log');
      if (fs.existsSync(errorLogPath)) {
        const stats = fs.statSync(errorLogPath);
        const now = new Date();
        const fileAge = now.getTime() - stats.mtime.getTime();
        
        // 최근 24시간 내 에러 로그가 있는지 확인
        if (fileAge < 24 * 60 * 60 * 1000) {
          try {
            const errorLogContent = fs.readFileSync(errorLogPath, 'utf8');
            const errorLines = errorLogContent.split('\n').filter(line => line.trim());
            healthStatus.logs.errorCount = errorLines.length;
            
            if (errorLines.length > 0) {
              const lastErrorLine = errorLines[errorLines.length - 1];
              try {
                const lastError = JSON.parse(lastErrorLine);
                healthStatus.logs.lastError = {
                  timestamp: lastError.timestamp,
                  message: lastError.message,
                  level: lastError.level
                };
              } catch (e) {
                // JSON 파싱 실패는 무시
              }
            }
          } catch (err) {
            logger.warn('Failed to read error log for health check', { error: err });
          }
        }
      }
    } else {
      healthStatus.services.logging = "No logs directory";
    }
    const logsDir = path.join(process.cwd(), 'logs');
    const logStatus = {
      status: "OK",
      timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
      correlationId: req.correlationId,
      logsDirectory: fs.existsSync(logsDir) ? "EXISTS" : "MISSING",
      logFiles: {},
      diskUsage: {
        totalSize: 0,
        errorLogSize: 0,
        combinedLogSize: 0,
        accessLogSize: 0
      }
    };

    if (fs.existsSync(logsDir)) {
      const logFiles = ['error.log', 'combined.log', 'access.log', 'exceptions.log', 'rejections.log'];
      
      for (const fileName of logFiles) {
        const filePath = path.join(logsDir, fileName);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          logStatus.logFiles[fileName] = {
            exists: true,
            size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
            lastModified: stats.mtime.toISOString()
          };
          logStatus.diskUsage.totalSize += stats.size;
          
          if (fileName === 'error.log') logStatus.diskUsage.errorLogSize = stats.size;
          if (fileName === 'combined.log') logStatus.diskUsage.combinedLogSize = stats.size;
          if (fileName === 'access.log') logStatus.diskUsage.accessLogSize = stats.size;
        } else {
          logStatus.logFiles[fileName] = { exists: false };
        }
      }
      
      logStatus.diskUsage.totalSize = `${(logStatus.diskUsage.totalSize / 1024 / 1024).toFixed(2)} MB`;
      logStatus.diskUsage.errorLogSize = `${(logStatus.diskUsage.errorLogSize / 1024 / 1024).toFixed(2)} MB`;
      logStatus.diskUsage.combinedLogSize = `${(logStatus.diskUsage.combinedLogSize / 1024 / 1024).toFixed(2)} MB`;
      logStatus.diskUsage.accessLogSize = `${(logStatus.diskUsage.accessLogSize / 1024 / 1024).toFixed(2)} MB`;
    }

    logger.info('Logs health check completed', { correlationId: req.correlationId });
    res.status(200).json(logStatus);
    
    // 전체 상태 결정
    const hasErrors = Object.values(healthStatus.services).some(status => 
      status === "Error" || status === "Disconnected"
    );
    
    if (hasErrors) {
      healthStatus.status = "DEGRADED";
      logger.warn('System health degraded', { healthStatus });
    }
    // 로깅 시스템 상태 확인
    const logsDir = path.join(process.cwd(), "logs");
    if (fs.existsSync(logsDir)) {
      healthStatus.services.logging = "OK";
    } else {
      healthStatus.services.logging = "No logs directory";
    }

  } catch (error) {
    logger.error("Health check failed", {
      error: error.message,
      correlationId: req.correlationId
    });
    logger.error('Logs health check failed', { 
      error: error.message,
      correlationId: req.correlationId 
    });
    
    res.status(500).json({
      status: "ERROR",
      message: "로깅 시스템 상태 확인 실패",
      error: error.message,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});
export default router;

// 📊 로깅 시스템 상세 상태
router.get("/logs", async (req: express.Request, res: express.Response) => {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    const logStatus = {
      status: "OK",
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      logsDirectory: fs.existsSync(logsDir) ? "EXISTS" : "MISSING",
      logFiles: {},
      diskUsage: {
        totalSize: 0,
        errorLogSize: 0,
        combinedLogSize: 0,
        accessLogSize: 0
      }
    };

    if (fs.existsSync(logsDir)) {
      const logFiles = ['error.log', 'combined.log', 'access.log', 'exceptions.log', 'rejections.log'];
      
      for (const fileName of logFiles) {
        const filePath = path.join(logsDir, fileName);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          logStatus.logFiles[fileName] = {
            exists: true,
            size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
            lastModified: stats.mtime.toISOString()
          };
          logStatus.diskUsage.totalSize += stats.size;
          
          if (fileName === 'error.log') logStatus.diskUsage.errorLogSize = stats.size;
          if (fileName === 'combined.log') logStatus.diskUsage.combinedLogSize = stats.size;
          if (fileName === 'access.log') logStatus.diskUsage.accessLogSize = stats.size;
        } else {
          logStatus.logFiles[fileName] = { exists: false };
        }
      }
      
      logStatus.diskUsage.totalSize = `${(logStatus.diskUsage.totalSize / 1024 / 1024).toFixed(2)} MB`;
      logStatus.diskUsage.errorLogSize = `${(logStatus.diskUsage.errorLogSize / 1024 / 1024).toFixed(2)} MB`;
      logStatus.diskUsage.combinedLogSize = `${(logStatus.diskUsage.combinedLogSize / 1024 / 1024).toFixed(2)} MB`;
      logStatus.diskUsage.accessLogSize = `${(logStatus.diskUsage.accessLogSize / 1024 / 1024).toFixed(2)} MB`;
    }

    logger.info('Logs health check completed', { correlationId: req.correlationId });
    res.status(200).json(logStatus);
    
  } catch (error: any) {
    logger.error('Logs health check failed', { 
      error: error.message,
      correlationId: req.correlationId 
    });
    
    res.status(500).json({
      status: "ERROR",
      message: "로깅 시스템 상태 확인 실패",
      error: error.message,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});
