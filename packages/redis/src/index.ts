import Redis from 'ioredis'

const redisUrl : string = process.env.REDIS_URL as string

export const redisClient = new Redis(redisUrl);

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

export { rateLimit, defaultKeyGenerator, skipHealthCheck } from "./rate-limit.js";
export type {
  RateLimitOptions,
  RateLimitRequest,
  RateLimitResponse,
  RateLimitNext,
} from "./rate-limit.js";