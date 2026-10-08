import { getPersonalContent } from "@/server/artifacts/personal";
import { personalContentActor, personalContentApiError } from "@/server/artifacts/personal-api";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
 try { const actor = await personalContentActor(), { id } = await params; return Response.json(await getPersonalContent(actor, id), { headers: { "cache-control": "no-store" } }); } catch (error) { return personalContentApiError(error); }
}
