import { Queue, Worker, type ConnectionOptions } from "bullmq";

export const SYSTEM_QUEUE = "system-health";
export const SYSTEM_HEALTH_CHECK = "SYSTEM_HEALTH_CHECK";

function connection(): ConnectionOptions {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: Number(redisUrl.pathname.slice(1) || 0),
  };
}

export function createHealthQueue() {
  return new Queue(SYSTEM_QUEUE, { connection: connection() });
}

export function createHealthWorker() {
  return new Worker(
    SYSTEM_QUEUE,
    async (job) => {
      if (job.name !== SYSTEM_HEALTH_CHECK) {
        throw new Error(`Unsupported job: ${job.name}`);
      }

      const result = { status: "ok" as const, processedAt: new Date().toISOString() };
      console.info("SYSTEM_HEALTH_CHECK_COMPLETED", { jobId: job.id });
      return result;
    },
    { connection: connection() },
  );
}
