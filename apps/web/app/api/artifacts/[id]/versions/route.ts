import { z } from "zod";
import { getPersonalContent, checkpointPersonalContent } from "@/server/artifacts/personal";
import { personalContentActor, personalContentApiError } from "@/server/artifacts/personal-api";
const schema = z.object({ expectedVersion: z.number().int().nonnegative(), restoreRevisionId: z.string().min(1).max(200).optional() }).strict();
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
 try { const actor = await personalContentActor(), { id } = await params; return Response.json({ items: (await getPersonalContent(actor, id)).revisions }, { headers: { "cache-control": "no-store" } }); } catch (error) { return personalContentApiError(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 try { const actor = await personalContentActor(), { id } = await params; return Response.json(await checkpointPersonalContent(actor, id, schema.parse(await request.json())), { headers: { "cache-control": "no-store" } }); } catch (error) { return personalContentApiError(error); }
}
