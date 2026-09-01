import { createHealthWorker } from "./queue";

const worker = createHealthWorker();
await worker.waitUntilReady();
console.info("WORKER_CONNECTED");

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
