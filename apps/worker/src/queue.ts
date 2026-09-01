import { Queue, UnrecoverableError, Worker, type ConnectionOptions } from "bullmq";
import { processContentIngestJob } from "./ingest";
import { processTranscribeSourceJob } from "./transcription";
import {
  transcriptionQueueConnection,
  TRANSCRIBE_SOURCE,
  TRANSCRIBE_SOURCE_QUEUE,
  type TranscribeSourcePayload,
} from "./transcription-queue";

export {
  createTranscribeSourceQueue,
  enqueueTranscribeSource,
  TRANSCRIBE_SOURCE,
  TRANSCRIBE_SOURCE_QUEUE,
  type TranscribeSourcePayload,
} from "./transcription-queue";

export const SYSTEM_QUEUE = "system-health";
export const SYSTEM_HEALTH_CHECK = "SYSTEM_HEALTH_CHECK";
export const CONTENT_INGEST_QUEUE = "content-ingest";
export const CONTENT_INGEST = "CONTENT_INGEST";

export type ContentIngestPayload = {
  jobId: string;
  workspaceId: string;
  sourceItemId: string;
  requestedById: string;
};
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

export function createContentIngestQueue() {
  return new Queue<ContentIngestPayload>(CONTENT_INGEST_QUEUE, { connection: connection() });
}

export async function enqueueContentIngest(payload: ContentIngestPayload, maxAttempts = 3) {
  const queue = createContentIngestQueue();
  try {
    return await queue.add(CONTENT_INGEST, payload, {
      jobId: `${payload.jobId}-${Date.now()}`,
      attempts: maxAttempts,
      backoff: { type: "exponential", delay: 500 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  } finally {
    await queue.close();
  }
}

export function createContentIngestWorker() {
  return new Worker<ContentIngestPayload>(
    CONTENT_INGEST_QUEUE,
    async (job) => {
      if (job.name !== CONTENT_INGEST) throw new UnrecoverableError(`Unsupported job: ${job.name}`);
      return processContentIngestJob(job);
    },
    { connection: connection(), concurrency: 2 },
  );
}

export function createTranscribeSourceWorker() {
  return new Worker<TranscribeSourcePayload>(
    TRANSCRIBE_SOURCE_QUEUE,
    async (job) => {
      if (job.name !== TRANSCRIBE_SOURCE) throw new UnrecoverableError(`Unsupported job: ${job.name}`);
      return processTranscribeSourceJob(job);
    },
    { connection: transcriptionQueueConnection(), concurrency: 1 },
  );
}
