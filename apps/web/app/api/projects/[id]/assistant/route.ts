import { z } from "zod";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";
import { assistantApiError } from "@/server/assistant/api";
import { getProjectAssistantThread, runProjectAssistant, type AssistantStreamEvent } from "@/server/assistant/service";

const requestSchema = z.object({
  content: z.string().trim().min(1).max(4_000),
  selectedObject: z.object({ objectType: z.literal("CANVAS_OBJECT"), objectId: z.string().min(1).max(200), version: z.number().int().positive().optional(), ownership: z.enum(["OWN_CONFIRMED", "EXTERNAL", "PENDING", "HYPOTHETICAL", "PROHIBITED", "METHOD_GUIDANCE"]).optional(), whySelected: z.string().max(200).optional() }).strict().optional(),
  sourceItemIds: z.array(z.string().min(1).max(200)).max(8).transform((ids) => [...new Set(ids)]).optional(),
}).strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, route: RouteContext) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  const { id } = await route.params;
  try { return Response.json(await getProjectAssistantThread({ workspaceId: context.workspace.id, userId: context.session.user.id, projectId: id })); }
  catch (error) { return assistantApiError(error); }
}

export async function POST(request: Request, route: RouteContext) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_INPUT", 400, "请输入要和鑫小助讨论的内容。");
  const { id } = await route.params;
  const encoder = new TextEncoder();
  const aborter = new AbortController();
  request.signal.addEventListener("abort", () => aborter.abort(), { once: true });
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: AssistantStreamEvent) => { if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); };
      void runProjectAssistant({ workspaceId: context.workspace.id, userId: context.session.user.id, projectId: id, ...parsed.data, signal: aborter.signal }, emit)
        .catch((error) => { const response = assistantApiError(error); emit({ type: "error", messageId: "", code: "UNKNOWN", message: response.status === 404 ? "当前项目不存在。" : "AI 处理失败，请稍后重试。" }); })
        .finally(() => { if (!closed) { closed = true; controller.close(); } });
    },
    cancel() { closed = true; aborter.abort(); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
}
