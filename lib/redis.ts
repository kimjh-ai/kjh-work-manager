import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

function createRedis() {
  return new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    lazyConnect: false,
  });
}

const redis = global._redis ?? createRedis();
if (process.env.NODE_ENV !== "production") global._redis = redis;

export default redis;
