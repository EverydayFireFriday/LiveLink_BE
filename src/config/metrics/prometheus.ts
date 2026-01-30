import promClient from 'prom-client';

// Prometheus metrics setup
const register = new promClient.Registry();

// Collect default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// HTTP Request Counter
export const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// HTTP Request Duration Histogram
export const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

// Active Connections Gauge
export const activeConnectionsGauge = new promClient.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

// Database Connection Status
export const dbConnectionGauge = new promClient.Gauge({
  name: 'db_connection_status',
  help: 'Database connection status (1 = connected, 0 = disconnected)',
  labelNames: ['database'],
  registers: [register],
});

// Redis Connection Status
export const redisConnectionGauge = new promClient.Gauge({
  name: 'redis_connection_status',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
  registers: [register],
});

// HTTP Error Counter
export const httpErrorCounter = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Cache Hits Counter
export const cacheHitsCounter = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

// Cache Misses Counter
export const cacheMissesCounter = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// Cache Hit Rate Gauge
export const cacheHitRateGauge = new promClient.Gauge({
  name: 'cache_hit_rate',
  help: 'Current cache hit rate percentage',
  registers: [register],
});

// Cache Operations Counter
export const cacheOperationsCounter = new promClient.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation'],
  registers: [register],
});

// Cache Response Time Histogram
export const cacheResponseTimeHistogram = new promClient.Histogram({
  name: 'cache_response_time_seconds',
  help: 'Cache response time in seconds',
  labelNames: ['operation', 'result'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export { register };
