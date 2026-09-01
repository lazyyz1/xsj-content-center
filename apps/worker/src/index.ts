import { createContentIngestWorker, createHealthWorker, createTranscribeSourceWorker } from "./queue";

const worker = createHealthWorker();
const ingestWorker = createContentIngestWorker();
const transcriptionWorker = createTranscribeSourceWorker();
await Promise.all([worker.waitUntilReady(), ingestWorker.waitUntilReady(), transcriptionWorker.waitUntilReady()]);
console.info("WORKER_CONNECTED");

async function shutdown() {
  await Promise.all([worker.close(), ingestWorker.close(), transcriptionWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
