import { experienceLimitsEnabled } from "./experience-limits";
import { Queue, type ConnectionOptions } from "bullmq";
import { createRedisConnection } from "./redis-connection";

export const TRANSCRIBE_SOURCE_QUEUE = "transcribe-source";
export const TRANSCRIBE_SOURCE = "TRANSCRIBE_SOURCE";

export type TranscribeSourcePayload = {
  jobId: string;
  workspaceId: string;
  sourceItemId: string;
  mediaAssetId?: string;
  videoAssetId?: string;
  requestedById: string;
};

function connection(): ConnectionOptions {
  return createRedisConnection();
}

export function createTranscribeSourceQueue() {
  return new Queue<TranscribeSourcePayload>(TRANSCRIBE_SOURCE_QUEUE, { connection: connection() });
}

export async function enqueueTranscribeSource(payload: TranscribeSourcePayload, maxAttempts = 3) {
  const queue = createTranscribeSourceQueue();
  try {
    if (experienceLimitsEnabled()) await queue.setGlobalConcurrency(2);
    return await queue.add(TRANSCRIBE_SOURCE, payload, {
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

export function transcriptionQueueConnection(): ConnectionOptions {
  return connection();
}
