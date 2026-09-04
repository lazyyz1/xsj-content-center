import type { ConnectionOptions } from "bullmq";

export function createRedisConnection(
  redisUrlValue = process.env.REDIS_URL ?? "redis://localhost:6379",
): ConnectionOptions {
  const redisUrl = new URL(redisUrlValue);

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: Number(redisUrl.pathname.slice(1) || 0),
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
  };
}
