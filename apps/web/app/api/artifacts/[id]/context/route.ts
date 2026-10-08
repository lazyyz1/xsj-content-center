import { z } from "zod";
import { updatePersonalContext } from "@/server/artifacts/personal";
import { researchSelectionSchema } from "@/server/research/contracts";
import { personalContentActor, personalContentApiError } from "@/server/artifacts/personal-api";
const schema = z.object({ expectedContextVersion: z.number().int().positive(), ownAngle: z.string().max(4000), sourceItemIds: z.array(z.string().min(1).max(200)).max(8).optional(), skillVersionIds: z.array(z.string().min(1).max(200)).max(5).optional(), research: z.object({ sourceId: z.string().min(1).max(200), selection: researchSelectionSchema }).strict().optional() }).strict();
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
 try { const actor = await personalContentActor(), { id } = await params; return Response.json(await updatePersonalContext(actor, id, schema.parse(await request.json())), { headers: { "cache-control": "no-store" } }); } catch (error) { return personalContentApiError(error); }
}
