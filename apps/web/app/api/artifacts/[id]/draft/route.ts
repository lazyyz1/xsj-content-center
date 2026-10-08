import { z } from "zod";
import { savePersonalDraft } from "@/server/artifacts/personal";
import { personalContentActor, personalContentApiError } from "@/server/artifacts/personal-api";
const schema = z.object({ expectedVersion: z.number().int().nonnegative(), title: z.string().max(200), body: z.string().max(1_000_000) }).strict();
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
 try { const actor = await personalContentActor(), { id } = await params; return Response.json(await savePersonalDraft(actor, id, schema.parse(await request.json())), { headers: { "cache-control": "no-store" } }); } catch (error) { return personalContentApiError(error); }
}
