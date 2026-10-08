import { z } from "zod";
import { classifyPersonalContent } from "@/server/artifacts/personal";
import { personalContentActor, personalContentApiError } from "@/server/artifacts/personal-api";
const schema = z.object({ projectId: z.string().min(1).max(200).nullable() }).strict();
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
 try { const actor = await personalContentActor(), { id } = await params, value = schema.parse(await request.json()); return Response.json(await classifyPersonalContent(actor, id, value.projectId), { headers: { "cache-control": "no-store" } }); } catch (error) { return personalContentApiError(error); }
}
