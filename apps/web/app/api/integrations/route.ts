import { canManageWorkspace } from "@content-center/core";
import { NextResponse } from "next/server";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";
import { getIntegrationStatuses, integrationVisibleToRole } from "@/server/integrations";

export async function GET() {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  const canManage = canManageWorkspace(context.role);
  const integrations = (await getIntegrationStatuses(context.workspace.id)).map((integration) =>
    integrationVisibleToRole(integration, canManage),
  );
  return NextResponse.json({ integrations });
}
