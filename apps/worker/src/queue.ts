import { Queue, UnrecoverableError, Worker, type Job } from "bullmq";
import { processContentIngestJob } from "./ingest";
import { processMaterialAnalysisJob } from "./material-analysis";
import { processBenchmarkStudyJob } from "./benchmark-analysis";
import { processMaterialDistillationJob } from "./material-distillation";
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
export const ANALYZE_BENCHMARK = "ANALYZE_BENCHMARK";
export const DISTILL_MATERIAL = "DISTILL_MATERIAL";

export type ContentIngestPayload = {
  jobId: string;
  workspaceId: string;
  sourceItemId: string;
  requestedById: string;
};

export type BenchmarkStudyPayload = {
  studyId: string;
  workspaceId: string;
  requestedById: string;
};

export type ContentIngestJobPayload = ContentIngestPayload | BenchmarkStudyPayload;
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
  return new Queue<ContentIngestJobPayload>(CONTENT_INGEST_QUEUE, { connection: createRedisConnection() });
}

async function enqueueOnContentQueue(name: typeof CONTENT_INGEST | typeof ANALYZE_MATERIAL | typeof ANALYZE_BENCHMARK | typeof DISTILL_MATERIAL, payload: ContentIngestJobPayload, maxAttempts: number) {
  const queue = createContentIngestQueue();
  try {
    const payloadId = "jobId" in payload ? payload.jobId : payload.studyId;
    return await queue.add(name, payload, {
      jobId: `${payloadId}-${Date.now()}`,
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

export async function enqueueBenchmarkStudy(payload: BenchmarkStudyPayload, maxAttempts = 3) {
  return enqueueOnContentQueue(ANALYZE_BENCHMARK, payload, maxAttempts);
}

export async function enqueueMaterialDistillation(payload: ContentIngestPayload, maxAttempts = 3) {
  return enqueueOnContentQueue(DISTILL_MATERIAL, payload, maxAttempts);
}

export async function enqueueContentIngest(payload: ContentIngestPayload, maxAttempts = 3) {
  return enqueueOnContentQueue(CONTENT_INGEST, payload, maxAttempts);
}

export function createContentIngestWorker() {
  return new Worker<ContentIngestJobPayload>(
    CONTENT_INGEST_QUEUE,
    async (job) => {
      if (job.name === CONTENT_INGEST) return processContentIngestJob(job as Job<ContentIngestPayload>);
      if (job.name === ANALYZE_MATERIAL) return processMaterialAnalysisJob(job as Job<ContentIngestPayload>);
      if (job.name === ANALYZE_BENCHMARK) return processBenchmarkStudyJob(job as Job<BenchmarkStudyPayload>);
      if (job.name === DISTILL_MATERIAL) return processMaterialDistillationJob(job as Job<ContentIngestPayload>);
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
