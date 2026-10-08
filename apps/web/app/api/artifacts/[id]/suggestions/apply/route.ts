import { z } from "zod";
import { applyPersonalContentSuggestion } from "@/server/assistant/personal-content";
import { personalContentActor, personalContentApiError } from "@/server/artifacts/personal-api";
const schema = z.object({ messageId: z.string().min(1).max(200), expectedVersion: z.number().int().nonnegative(), expectedContextVersion: z.number().int().positive() }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 try { const actor = await personalContentActor(), { id } = await params; return Response.json(await applyPersonalContentSuggestion(actor, id, schema.parse(await request.json())), { headers:{ "cache-control":"no-store" } }); } catch(error) { return personalContentApiError(error); }
}
