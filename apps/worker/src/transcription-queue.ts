import { Queue, type ConnectionOptions } from "bullmq";

export const TRANSCRIBE_SOURCE_QUEUE = "transcribe-source";
export const TRANSCRIBE_SOURCE = "TRANSCRIBE_SOURCE";

export type TranscribeSourcePayload = {
  jobId: string;
  workspaceId: string;
  sourceItemId: string;
  videoAssetId: string;
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

export function createTranscribeSourceQueue() {
  return new Queue<TranscribeSourcePayload>(TRANSCRIBE_SOURCE_QUEUE, { connection: connection() });
}

export async function enqueueTranscribeSource(payload: TranscribeSourcePayload, maxAttempts = 3) {
  const queue = createTranscribeSourceQueue();
  try {
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
