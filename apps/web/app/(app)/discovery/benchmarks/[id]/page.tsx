import { db } from "@content-center/db";
import { notFound } from "next/navigation";
import { BenchmarkWorkspace } from "@/components/discovery/benchmark-workspace";
import { requireWorkspace } from "@/server/access";

export default async function BenchmarkPage({ params }: PageProps<"/discovery/benchmarks/[id]">) {
  const { workspace, role } = await requireWorkspace(); const { id } = await params;
  const item = await db.benchmarkAccount.findFirst({ where: { id, workspaceId: workspace.id, enabled: true } });
  if (!item) notFound();
  return <BenchmarkWorkspace benchmark={{ id: item.id, name: item.name, platform: item.platform, avatarUrl: item.avatarUrl, bio: item.bio, lastSyncedAt: item.lastSyncedAt?.toISOString() ?? null }} canRefresh={role !== "VIEWER"} canManage={role === "OWNER" || role === "ADMIN"} />;
}
