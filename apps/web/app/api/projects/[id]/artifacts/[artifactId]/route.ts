import { apiError, getApiWorkspaceContext } from "@/server/api-access";
import { artifactApiError } from "@/server/artifacts/api";
import { getArtifact } from "@/server/artifacts/service";

type RouteContext = { params: Promise<{ id: string; artifactId: string }> };

export async function GET(_request: Request, route: RouteContext) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  const { id: projectId, artifactId } = await route.params;
  try { return Response.json(await getArtifact({ workspaceId: context.workspace.id, userId: context.session.user.id, projectId, artifactId })); }
  catch (error) { return artifactApiError(error); }
}
