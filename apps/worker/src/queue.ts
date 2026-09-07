import { Queue, UnrecoverableError, Worker } from "bullmq";
import { processContentIngestJob } from "./ingest";
import { processMaterialAnalysisJob } from "./material-analysis";
import { createRedisConnection } from "./redis-connection";
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
export const ANALYZE_MATERIAL = "ANALYZE_MATERIAL";

export type ContentIngestPayload = {
  jobId: string;
  workspaceId: string;
  sourceItemId: string;
  requestedById: string;
};
export function createHealthQueue() {
  return new Queue(SYSTEM_QUEUE, { connection: createRedisConnection() });
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
    { connection: createRedisConnection() },
  );
}

export function createContentIngestQueue() {
  return new Queue<ContentIngestPayload>(CONTENT_INGEST_QUEUE, { connection: createRedisConnection() });
}

async function enqueueOnContentQueue(name: typeof CONTENT_INGEST | typeof ANALYZE_MATERIAL, payload: ContentIngestPayload, maxAttempts: number) {
  const queue = createContentIngestQueue();
  try {
    return await queue.add(name, payload, {
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

export async function enqueueMaterialAnalysis(payload: ContentIngestPayload, maxAttempts = 3) {
  return enqueueOnContentQueue(ANALYZE_MATERIAL, payload, maxAttempts);
}

export async function enqueueContentIngest(payload: ContentIngestPayload, maxAttempts = 3) {
  return enqueueOnContentQueue(CONTENT_INGEST, payload, maxAttempts);
}

export function createContentIngestWorker() {
  return new Worker<ContentIngestPayload>(
    CONTENT_INGEST_QUEUE,
    async (job) => {
      if (job.name === CONTENT_INGEST) return processContentIngestJob(job);
      if (job.name === ANALYZE_MATERIAL) return processMaterialAnalysisJob(job);
      throw new UnrecoverableError(`Unsupported job: ${job.name}`);
    },
    { connection: createRedisConnection(), concurrency: 2 },
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
