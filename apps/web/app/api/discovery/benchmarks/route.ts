import { NextResponse } from "next/server";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";
import { discoveryApiError } from "@/server/discovery/api";
import { addBenchmarkSchema } from "@/server/discovery/schemas";
import { addBenchmark, listBenchmarks } from "@/server/discovery/service";

export async function GET() {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  return NextResponse.json({ items: await listBenchmarks(context.workspace.id) });
}

export async function POST(request: Request) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role !== "OWNER" && context.role !== "ADMIN") return apiError("FORBIDDEN", 403, "只有管理员可以管理共享对标账号。");
  try {
    const input = addBenchmarkSchema.parse(await request.json().catch(() => null));
    const item = await addBenchmark({ workspaceId: context.workspace.id, userId: context.session.user.id, account: input.account });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return discoveryApiError(error);
  }
}
