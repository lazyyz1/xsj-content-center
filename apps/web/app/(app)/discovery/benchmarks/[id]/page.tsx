/* finesse · register=product · shell=floating-research-canvas · palette=cool-slate-cobalt · density=7 */
import { notFound } from "next/navigation";
import { BenchmarkWorkspace } from "@/components/discovery/benchmark-workspace";
import { requireWorkspace } from "@/server/access";
import { getBenchmarkCreatorDetail } from "@/server/discovery/benchmark-creator-read-model";
import { listBenchmarkCandidates, listBenchmarkStudies } from "@/server/discovery/benchmark-study-service";
import { listMethodSuggestions } from "@/server/learning-suggestions/service";

export default async function BenchmarkPage({ params }: PageProps<"/discovery/benchmarks/[id]">) {
  const { workspace, session, role } = await requireWorkspace(); const { id } = await params;
  const profile = await getBenchmarkCreatorDetail({ workspaceId: workspace.id, benchmarkAccountId: id, ownerUserId: session.user.id });
  if (!profile) notFound();
  const [candidates, studies, methodSuggestions] = await Promise.all([
    listBenchmarkCandidates({ workspaceId: workspace.id, benchmarkAccountId: profile.account.id }),
    listBenchmarkStudies({ workspaceId: workspace.id, benchmarkAccountId: profile.account.id }),
    listMethodSuggestions({ workspaceId: workspace.id, userId: session.user.id, benchmarkAccountId: profile.account.id }),
  ]);
  const suggestionStudyId = studies.find((study) => study.kind === "ACCOUNT_RESEARCH" && study.status === "COMPLETED" && study.output && !("kind" in study.output) && study.output.commonMethods.length)?.id ?? null;
  return <BenchmarkWorkspace profile={profile} candidates={candidates} studies={studies} methodSuggestions={methodSuggestions} suggestionStudyId={suggestionStudyId} canRefresh={role !== "VIEWER"} canManage={role === "OWNER" || role === "ADMIN"} />;
}
