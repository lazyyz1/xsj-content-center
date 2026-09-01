import { createContentIngestWorker, createHealthWorker } from "./queue";

const worker = createHealthWorker();
const ingestWorker = createContentIngestWorker();
await Promise.all([worker.waitUntilReady(), ingestWorker.waitUntilReady()]);
console.info("WORKER_CONNECTED");

async function shutdown() {
  await Promise.all([worker.close(), ingestWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
