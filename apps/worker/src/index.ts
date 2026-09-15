import { createServer } from "node:http";
import { createContentIngestWorker, createHealthWorker, createTranscribeSourceWorker } from "./queue";
import { cleanupExpiredAsrAudio } from "./transcription";

const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? "3010");
let ready = false;
const healthServer = createServer((request, response) => {
  if (request.url !== "/" && request.url !== "/health") {
    response.writeHead(404);
    response.end();
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  response.writeHead(ready ? 200 : 503, { "Content-Type": "application/json" });
  response.end(request.method === "HEAD" ? undefined : JSON.stringify({ status: ready ? "READY" : "STARTING" }));
});
healthServer.listen(healthPort, "127.0.0.1");

const worker = createHealthWorker();
const ingestWorker = createContentIngestWorker();
const transcriptionWorker = createTranscribeSourceWorker();
await Promise.all([worker.waitUntilReady(), ingestWorker.waitUntilReady(), transcriptionWorker.waitUntilReady()]);
ready = true;
console.info("WORKER_CONNECTED");

const audioCleanupTimer = setInterval(() => {
  void cleanupExpiredAsrAudio().catch(() => console.warn("ASR_AUDIO_CLEANUP_RUN_FAILED"));
}, 60 * 60 * 1_000);
audioCleanupTimer.unref();

async function shutdown() {
  ready = false;
  clearInterval(audioCleanupTimer);
  await new Promise<void>((resolve) => {
    if (!healthServer.listening) {
      resolve();
      return;
    }
    healthServer.close(() => resolve());
  });
  await Promise.all([worker.close(), ingestWorker.close(), transcriptionWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
