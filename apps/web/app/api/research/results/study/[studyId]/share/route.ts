import { z } from "zod";
import { researchApiActor, researchApiError } from "@/server/research/api";
import { shareLegacyStudyToProject } from "@/server/research/sharing";
const body = z.object({ projectId: z.string().min(1).max(200) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ studyId: string }> }) {
  try { const { studyId } = await params; const { projectId } = body.parse(await request.json()); return Response.json(await shareLegacyStudyToProject(await researchApiActor(), studyId, projectId), { status: 201 }); }
  catch (error) { return researchApiError(error); }
}
