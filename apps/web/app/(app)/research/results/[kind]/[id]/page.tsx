import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/server/access";
import { getResearchResult, researchProjectOptions } from "@/server/research/read-model";
import { ResearchError } from "@/server/research/access";
import { ResearchBlocks } from "@/components/research/research-blocks";
import { getLegacyResearchResult } from "@/server/research/legacy";
import { buildResearchSharePreview } from "@/server/research/sharing";
import { ResearchShare } from "@/components/research/research-share";
import { ResearchCoverageSummary } from "@/components/research/research-coverage";
export default async function ResultPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params; if (kind !== "run" && kind !== "study") notFound(); const { workspace, session, role } = await requireWorkspace();
  if (kind === "study") {
    try { const actor = { workspaceId: workspace.id, userId: session.user.id }; const [result, projects] = await Promise.all([getLegacyResearchResult(actor, id), researchProjectOptions(actor)]); const preview = buildResearchSharePreview(result.title, result.blocks); return <article className="research-result-page"><header className="research-page-heading"><div><span className="research-eyebrow">工作空间历史研究</span><h1>{result.title}</h1><p>记录于 {result.createdAt.toLocaleString("zh-CN")} · 本页只读已保存的结果，不会重新调用 AI。</p></div></header><div className="research-result-actions"><Link href={`/research/benchmarks/${result.accountId}`}>查看对标账号</Link><Link href="/research/results?library=workspace">返回历史成果</Link><Link href="#share-result">加入 Project</Link></div><section className="research-section research-coverage-summary"><header><h2>历史样本范围</h2><span>按保存时记录</span></header><p>保存样本 {result.sampleCount} 条；仍可追溯资料关系 {result.traceableCount} 条。没有重新采集，不把这些样本扩大解释为账号全量。</p></section><ResearchBlocks blocks={result.blocks} prefix={result.id} /><ResearchShare kind="study" resultId={result.id} projects={projects} preview={preview} canWrite={role !== "VIEWER"} /></article>; } catch (error) { if (error instanceof ResearchError && error.status === 404) notFound(); throw error; }
  }
  try { const actor = { workspaceId: workspace.id, userId: session.user.id }; const [result, projects] = await Promise.all([getResearchResult(actor, id), researchProjectOptions(actor)]); const preview = buildResearchSharePreview(result.resultTitle || result.question, result.blocks); return <article className="research-result-page"><header className="research-page-heading"><div><span className="research-eyebrow">已保存的私人研究成果</span><h1>{result.resultTitle || result.question}</h1><p>第 {result.version} 次研究 · 保存于 {result.savedAt?.toLocaleString("zh-CN")} · 此结果不会被后续追问覆盖。</p></div></header><div className="research-result-actions"><Link href={`/research/session/${result.sessionId}`}>继续研究</Link><Link href="/research/results">返回成果库</Link><Link href="#share-result">加入 Project</Link></div><ResearchCoverageSummary value={result.coverage} /><ResearchBlocks blocks={result.blocks} prefix={result.id} /><ResearchShare kind="run" resultId={result.id} projects={projects} preview={preview} canWrite={role !== "VIEWER"} /></article>; } catch (error) { if (error instanceof ResearchError && error.status === 404) notFound(); throw error; }
}
