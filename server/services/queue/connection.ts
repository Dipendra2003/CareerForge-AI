import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 3) {
       return null;
    }
    return Math.min(times * 50, 2000);
  }
});

connection.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') {
     console.error('❌ Redis connection refused. Please ensure Redis is running or REDIS_URL is set.');
  } else {
     console.error('Redis error:', err);
  }
});
