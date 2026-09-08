/* finesse · register=product · shell=floating-research-canvas · palette=cool-slate-cobalt · density=7 */
import { notFound } from "next/navigation";
import { BenchmarkWorkspace } from "@/components/discovery/benchmark-workspace";
import { requireWorkspace } from "@/server/access";
import { getBenchmarkCreatorDetail } from "@/server/discovery/benchmark-creator-read-model";
import { listBenchmarkCandidates, listBenchmarkStudies } from "@/server/discovery/benchmark-study-service";

export default async function BenchmarkPage({ params }: PageProps<"/discovery/benchmarks/[id]">) {
  const { workspace, session, role } = await requireWorkspace(); const { id } = await params;
  const profile = await getBenchmarkCreatorDetail({ workspaceId: workspace.id, benchmarkAccountId: id, ownerUserId: session.user.id });
  if (!profile) notFound();
  const [candidates, studies] = await Promise.all([
    listBenchmarkCandidates({ workspaceId: workspace.id, benchmarkAccountId: profile.account.id }),
    listBenchmarkStudies({ workspaceId: workspace.id, benchmarkAccountId: profile.account.id }),
  ]);
  return <BenchmarkWorkspace profile={profile} candidates={candidates} studies={studies} canRefresh={role !== "VIEWER"} canManage={role === "OWNER" || role === "ADMIN"} />;
}
