import { createContentIngestWorker, createHealthWorker, createTranscribeSourceWorker } from "./queue";
import { cleanupExpiredAsrAudio } from "./transcription";

const worker = createHealthWorker();
const ingestWorker = createContentIngestWorker();
const transcriptionWorker = createTranscribeSourceWorker();
await Promise.all([worker.waitUntilReady(), ingestWorker.waitUntilReady(), transcriptionWorker.waitUntilReady()]);
console.info("WORKER_CONNECTED");

const audioCleanupTimer = setInterval(() => {
  void cleanupExpiredAsrAudio().catch(() => console.warn("ASR_AUDIO_CLEANUP_RUN_FAILED"));
}, 60 * 60 * 1_000);
audioCleanupTimer.unref();

async function shutdown() {
  clearInterval(audioCleanupTimer);
  await Promise.all([worker.close(), ingestWorker.close(), transcriptionWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
