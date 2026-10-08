import { createPersonalContent, listPersonalContents } from "@/server/artifacts/personal";
import { personalContentActor, personalContentApiError } from "@/server/artifacts/personal-api";
export async function GET(request: Request) {
 try { const actor = await personalContentActor(), query = new URL(request.url).searchParams; return Response.json({ items: await listPersonalContents(actor, { q: query.get("q") || undefined, projectId: query.get("projectId") || undefined, unclassified: query.get("view") === "unclassified" }) }, { headers: { "cache-control": "no-store" } }); } catch (error) { return personalContentApiError(error); }
}
export async function POST(request: Request) {
 try { const actor = await personalContentActor(), content = await createPersonalContent(actor, await request.json()); return Response.json({ ...content, href: "/content/" + content.artifactId }, { headers: { "cache-control": "no-store" } }); } catch (error) { return personalContentApiError(error); }
}
