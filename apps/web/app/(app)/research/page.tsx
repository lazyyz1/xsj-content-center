import Link from "next/link";
import { requireWorkspace } from "@/server/access";
import { listResearchMaterials, listResearchSessions } from "@/server/research/service";
import { listResearchResults } from "@/server/research/read-model";
import { db } from "@content-center/db";
import { parseTrendStableKey } from "@/server/research/trends";
import { recentResearchObjects } from "@/server/research/preferences";
import { platformLabel } from "@/components/research/research-labels";
import { ResearchComposer } from "@/components/research/research-composer";
export default async function ResearchHome({ searchParams }: { searchParams: Promise<{ projectId?: string; entry?: string; accounts?: string | string[]; trend?: string }> }) {
  const { workspace, session, role } = await requireWorkspace(); const actor = { workspaceId: workspace.id, userId: session.user.id };
  const [sessions, materials, results, recent, params] = await Promise.all([listResearchSessions(actor), listResearchMaterials(actor), listResearchResults(actor), recentResearchObjects(actor), searchParams]);
  const rawAccounts = typeof params.accounts === "string" ? [params.accounts] : params.accounts ?? [];
  const requestedAccounts = [...new Set(rawAccounts.flatMap(value => value.split(",")).filter(Boolean))];
  const accountIds = requestedAccounts.length <= 3 ? requestedAccounts : [];
  const accounts = accountIds.length ? await db.benchmarkAccount.findMany({ where: { workspaceId: workspace.id, enabled: true, id: { in: accountIds } }, select: { id: true, name: true } }) : [];
  let trend: { key: string; title: string } | null = null;
  if (typeof params.trend === "string") {
    try {
      const identity = parseTrendStableKey(params.trend);
      const snapshot = await db.trendSnapshot.findFirst({ where: { workspaceId: workspace.id, ...identity }, orderBy: [{ observedAt: "desc" }, { id: "desc" }], select: { title: true } });
      if (snapshot) trend = { key: params.trend, title: snapshot.title };
    } catch { /* Invalid links cannot attach out-of-scope trends. */ }
  }
  const scope = accounts.length || trend ? { materialIds: [], benchmarkAccountIds: accounts.map(item => item.id), trendKeys: trend ? [trend.key] : [], notes: "", useCreatorProfile: false, useOwnArtifacts: false } : undefined;
  const entry = params.entry === "BENCHMARK" ? "BENCHMARK" : params.entry === "OPPORTUNITY" ? "OPPORTUNITY" : "DIRECT";
  return <div className="research-home"><header className="research-page-heading"><div><span className="research-eyebrow">从问题到可核验的结论</span><h1>开始一次研究</h1><p>选择资料、提出问题，把值得保留的判断存成可以重新找到的成果。</p></div></header>{requestedAccounts.length > 3 ? <p className="research-error" role="alert">一次最多选择 3 个对标账号。请返回账号列表，缩小比较范围。</p> : null}{accounts.length !== accountIds.length ? <p className="research-error" role="alert">部分对标账号不可访问，请重新选择。</p> : null}{params.trend && !trend ? <p className="research-error" role="alert">所选趋势无法访问，请重新选择。</p> : null}<ResearchComposer initialMaterials={materials} initialAccounts={accounts} initialTrends={trend ? [trend] : []} initialScope={scope} initialEntry={entry} projectId={params.projectId} canWrite={role !== "VIEWER"} /><section className="research-section"><header><h2>继续研究</h2><span>私人会话</span></header>{sessions.length ? <ul className="research-list">{sessions.slice(0, 8).map(item => <li key={item.id}><Link href={`/research/session/${item.id}`}><strong>{item.title}</strong><small>最近活动 {item.updatedAt.toLocaleDateString("zh-CN")}</small><span>继续 →</span></Link></li>)}</ul> : <div className="research-center-empty"><h3>还没有研究会话</h3><p>直接输入问题即可开始；没有资料时，AI 会说明证据缺口。</p></div>}</section><section className="research-section"><header><h2>最近保存成果</h2><Link href="/research/results">查看全部 →</Link></header>{results.length ? <ul className="research-list">{results.slice(0, 5).map(item => <li key={item.id}><Link href={`/research/results/run/${item.id}`}><strong>{item.resultTitle || item.question}</strong><small>{item.savedAt?.toLocaleDateString("zh-CN")}</small></Link></li>)}</ul> : <p className="research-center-empty-inline">研究完成后，点击“保存本次成果”，重要结论就会出现在这里。</p>}</section><section className="research-section"><header><h2>最近查看的对标账号</h2><Link href="/research/benchmarks">查看全部 →</Link></header>{recent.accounts.length ? <ul className="research-list">{recent.accounts.map(item => <li key={item.id}><Link href={`/research/benchmarks/${item.id}`}><strong>{item.name}</strong><small>{platformLabel[item.platform] || "其他平台"} · 最近查看 {item.viewedAt?.toLocaleDateString("zh-CN")}</small></Link></li>)}</ul> : <p className="research-center-empty-inline">查看对标账号后，可从这里快速返回。</p>}</section><section className="research-section"><header><h2>最近查看的趋势</h2><Link href="/research/trends">查看全部 →</Link></header>{recent.trends.length ? <ul className="research-list">{recent.trends.map(item => <li key={item.key}><Link href={`/research/trends/${item.key}`}><strong>{item.title}</strong><small>最近查看 {item.viewedAt?.toLocaleDateString("zh-CN")}</small></Link></li>)}</ul> : <p className="research-center-empty-inline">查看趋势详情后，可从这里快速返回。</p>}</section></div>;
}
