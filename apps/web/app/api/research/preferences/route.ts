import { researchApiActor, researchApiError } from "@/server/research/api";
import { researchObjectAction } from "@/server/research/preferences";
export async function POST(request: Request) {
  try { return Response.json(await researchObjectAction(await researchApiActor(), await request.json())); }
  catch (error) { return researchApiError(error); }
}
