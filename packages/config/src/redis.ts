import { Redis } from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};

export const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  console.log('Redis conectado');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});