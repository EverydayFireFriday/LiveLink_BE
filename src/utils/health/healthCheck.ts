import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import logger from '../logger/logger';
import type { MongoClient } from 'mongodb';
import type Redis from 'ioredis';

const execAsync = promisify(exec);

/**
 * Health Check 유틸리티
 * 시스템 리소스 및 외부 서비스 상태 확인
 */

export interface SystemHealth {
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
    heapUsed: number;
    heapTotal: number;
    heapUsagePercent: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  cpu: {
    cores: number;
    model: string;
    loadAverage: number[];
    usagePercent: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  disk?: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  uptime: {
    process: number;
    system: number;
  };
}

export interface ExternalServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

/**
 * 메모리 사용량 확인
 */
export function getMemoryHealth(): SystemHealth['memory'] {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usagePercent = (usedMemory / totalMemory) * 100;

  const heapStats = process.memoryUsage();
  const heapUsagePercent = (heapStats.heapUsed / heapStats.heapTotal) * 100;

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (usagePercent > 90) status = 'critical';
  else if (usagePercent > 75) status = 'warning';

  return {
    total: Math.round(totalMemory / 1024 / 1024), // MB
    free: Math.round(freeMemory / 1024 / 1024), // MB
    used: Math.round(usedMemory / 1024 / 1024), // MB
    usagePercent: Math.round(usagePercent * 100) / 100,
    heapUsed: Math.round(heapStats.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(heapStats.heapTotal / 1024 / 1024), // MB
    heapUsagePercent: Math.round(heapUsagePercent * 100) / 100,
    status,
  };
}

/**
 * CPU 사용량 확인
 */
export function getCpuHealth(): SystemHealth['cpu'] {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  // Load average를 CPU 코어 수로 나눠서 사용률 계산
  const usagePercent = (loadAvg[0] / cpus.length) * 100;

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (usagePercent > 90) status = 'critical';
  else if (usagePercent > 75) status = 'warning';

  return {
    cores: cpus.length,
    model: cpus[0]?.model || 'Unknown',
    loadAverage: loadAvg.map((load) => Math.round(load * 100) / 100),
    usagePercent: Math.round(usagePercent * 100) / 100,
    status,
  };
}

/**
 * 디스크 사용량 확인 (Linux/Mac)
 */
export async function getDiskHealth(): Promise<
  SystemHealth['disk'] | undefined
> {
  try {
    // df 명령어로 디스크 사용량 조회 (루트 파티션)
    const { stdout } = await execAsync('df -k / | tail -1');

    // 출력 예: /dev/disk1s1 489825920 298765432 184392888 62% /
    const parts = stdout.trim().split(/\s+/);

    if (parts.length >= 5) {
      const total = parseInt(parts[1]) / 1024; // MB
      const used = parseInt(parts[2]) / 1024; // MB
      const free = parseInt(parts[3]) / 1024; // MB
      const usagePercent = parseFloat(parts[4].replace('%', ''));

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (usagePercent > 90) status = 'critical';
      else if (usagePercent > 80) status = 'warning';

      return {
        total: Math.round(total),
        used: Math.round(used),
        free: Math.round(free),
        usagePercent: Math.round(usagePercent * 100) / 100,
        status,
      };
    }
  } catch (error) {
    logger.warn('디스크 사용량 조회 실패:', error);
  }

  return undefined;
}

/**
 * 업타임 정보
 */
export function getUptimeInfo(): SystemHealth['uptime'] {
  return {
    process: Math.floor(process.uptime()), // 프로세스 가동 시간 (초)
    system: Math.floor(os.uptime()), // 시스템 가동 시간 (초)
  };
}

/**
 * 전체 시스템 헬스 체크
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const memory = getMemoryHealth();
  const cpu = getCpuHealth();
  const disk = await getDiskHealth();
  const uptime = getUptimeInfo();

  return {
    memory,
    cpu,
    disk,
    uptime,
  };
}

/**
 * 외부 API 연결 확인 (예: Firebase, AWS S3 등)
 */
export async function checkExternalService(
  name: string,
  checkFn: () => Promise<void>,
  timeout = 5000,
): Promise<ExternalServiceHealth> {
  const startTime = Date.now();

  try {
    // 타임아웃 적용
    await Promise.race([
      checkFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout),
      ),
    ]);

    const responseTime = Date.now() - startTime;

    return {
      name,
      status: 'up',
      responseTime,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      name,
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * MongoDB 연결 확인
 */
export async function checkMongoDBHealth(
  client: MongoClient,
): Promise<ExternalServiceHealth> {
  return checkExternalService('MongoDB', async () => {
    await client.db().admin().ping();
  });
}

/**
 * Redis 연결 확인
 */
export async function checkRedisHealth(
  client: Redis,
): Promise<ExternalServiceHealth> {
  return checkExternalService('Redis', async () => {
    await client.ping();
  });
}

/**
 * Firebase Admin 연결 확인
 */
export async function checkFirebaseHealth(): Promise<ExternalServiceHealth> {
  return checkExternalService('Firebase', async () => {
    const { getApps } = await import('firebase-admin/app');
    if (getApps().length === 0) {
      throw new Error('Firebase not initialized');
    }
  });
}

/**
 * 전반적인 헬스 상태 판단
 */
export function getOverallHealthStatus(
  systemHealth: SystemHealth,
  externalServices: ExternalServiceHealth[],
): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
} {
  const issues: string[] = [];

  // 시스템 리소스 체크
  if (systemHealth.memory.status === 'critical') {
    issues.push(`메모리 사용량 위험 (${systemHealth.memory.usagePercent}%)`);
  } else if (systemHealth.memory.status === 'warning') {
    issues.push(`메모리 사용량 경고 (${systemHealth.memory.usagePercent}%)`);
  }

  if (systemHealth.cpu.status === 'critical') {
    issues.push(`CPU 사용량 위험 (${systemHealth.cpu.usagePercent}%)`);
  } else if (systemHealth.cpu.status === 'warning') {
    issues.push(`CPU 사용량 경고 (${systemHealth.cpu.usagePercent}%)`);
  }

  if (systemHealth.disk?.status === 'critical') {
    issues.push(`디스크 사용량 위험 (${systemHealth.disk.usagePercent}%)`);
  } else if (systemHealth.disk?.status === 'warning') {
    issues.push(`디스크 사용량 경고 (${systemHealth.disk.usagePercent}%)`);
  }

  // 외부 서비스 체크
  const downServices = externalServices.filter((s) => s.status === 'down');
  const degradedServices = externalServices.filter(
    (s) => s.status === 'degraded',
  );

  downServices.forEach((service) => {
    issues.push(`${service.name} 서비스 다운`);
  });

  degradedServices.forEach((service) => {
    issues.push(`${service.name} 서비스 성능 저하`);
  });

  // 전체 상태 판단
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (
    downServices.length > 0 ||
    systemHealth.memory.status === 'critical' ||
    systemHealth.cpu.status === 'critical' ||
    systemHealth.disk?.status === 'critical'
  ) {
    status = 'unhealthy';
  } else if (
    degradedServices.length > 0 ||
    systemHealth.memory.status === 'warning' ||
    systemHealth.cpu.status === 'warning' ||
    systemHealth.disk?.status === 'warning'
  ) {
    status = 'degraded';
  }

  return { status, issues };
}
