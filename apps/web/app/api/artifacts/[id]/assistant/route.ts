import { z } from "zod";
import { getPersonalContentThread, runPersonalContentAssistant } from "@/server/assistant/personal-content";
import { personalContentForUser } from "@/server/artifacts/personal";
import { personalContentActor, personalContentApiError } from "@/server/artifacts/personal-api";
import type { AssistantStreamEvent } from "@/lib/contracts/assistant";
const schema = z.object({ content: z.string().trim().min(1).max(4000), mode: z.enum(["chat","rewrite"]).default("chat"), requestId: z.string().uuid(), expectedVersion: z.number().int().nonnegative(), expectedContextVersion: z.number().int().positive(), sourceItemIds: z.array(z.string().min(1).max(200)).max(8).optional(), skillVersionId: z.string().min(1).max(200).nullable().optional(), retryUserMessageId: z.string().min(1).max(200).optional(), modelSelection: z.object({ provider: z.enum(["KIMI","DEEPSEEK","CUSTOM"]), modelId: z.string().min(1).max(200) }).strict().nullable().optional() }).strict();
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
 try { const actor = await personalContentActor(), { id } = await params; return Response.json(await getPersonalContentThread(actor, id), { headers: { "cache-control":"no-store" } }); } catch(error) { return personalContentApiError(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 try {
  const actor = await personalContentActor(), { id } = await params, input = schema.parse(await request.json()); await personalContentForUser(actor, id, true);
  const encoder = new TextEncoder(), aborter = new AbortController(); let closed = false;
  request.signal.addEventListener("abort", () => aborter.abort(), { once:true }); if(request.signal.aborted) aborter.abort();
  const stream = new ReadableStream<Uint8Array>({
   start(controller) {
    const emit = (event: AssistantStreamEvent) => { if(!closed) controller.enqueue(encoder.encode("data: " + JSON.stringify(event) + "\n\n")); };
    void runPersonalContentAssistant({ ...actor, artifactId:id, ...input, signal:aborter.signal }, emit).catch(error => { emit({ type:"error", messageId:"", code:"CONTENT_ASSISTANT_UNAVAILABLE", message: typeof error?.message === "string" && "status" in error ? error.message : "回复未完成，稿件与参考仍保留。" }); }).finally(() => { if(!closed) { closed = true; controller.close(); } });
   }, cancel() { closed = true; aborter.abort(); },
  });
  return new Response(stream, { headers: { "content-type":"text/event-stream; charset=utf-8", "cache-control":"no-cache, no-transform", connection:"keep-alive" } });
 } catch(error) { return personalContentApiError(error); }
}
