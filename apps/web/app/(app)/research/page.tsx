import ResearchBenchmarks from "./benchmarks/page";
import Link from "next/link";
import { RESEARCH_ENTRY_LABELS } from "@content-center/core";
import { requireWorkspace } from "@/server/access";
import { listResearchMaterials, listResearchSessions } from "@/server/research/service";
import { listResearchResults } from "@/server/research/read-model";
import { db } from "@content-center/db";
import { parseTrendStableKey } from "@/server/research/trends";
import { recentResearchObjects } from "@/server/research/preferences";
import { platformLabel } from "@/components/research/research-labels";
import { ResearchComposer } from "@/components/research/research-composer";
export default async function ResearchHome({ searchParams }: { searchParams: Promise<{ q?: string; platform?: string; category?: string; page?: string; projectId?: string; entry?: string; accounts?: string | string[]; trend?: string; material?: string }> }) {
  const requested = await searchParams;
  if (!requested.entry && !requested.accounts && !requested.material && !requested.trend && !requested.projectId) return <ResearchBenchmarks searchParams={Promise.resolve(requested)} />;
  const { workspace, session, role } = await requireWorkspace(); const actor = { workspaceId: workspace.id, userId: session.user.id };
  const [sessions, materials, results, recent, params] = await Promise.all([listResearchSessions(actor), listResearchMaterials(actor), listResearchResults(actor), recentResearchObjects(actor), searchParams]);
  const updatedAccounts = await db.benchmarkAccount.findMany({ where: { workspaceId: workspace.id, enabled: true }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 4, select: { id: true, name: true, platform: true, updatedAt: true } });
  const starting = Boolean(params.entry || params.accounts || params.material || params.trend || params.projectId);
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
  const selectedMaterial = typeof params.material === "string" ? await db.sourceItem.findFirst({ where: { id: params.material, workspaceId: workspace.id, status: { not: "ARCHIVED" } }, select: { id: true, title: true, sourceType: true } }) : null;
  const scope = accounts.length || trend || selectedMaterial ? { materialIds: selectedMaterial ? [selectedMaterial.id] : [], benchmarkAccountIds: accounts.map(item => item.id), trendKeys: trend ? [trend.key] : [], notes: "", useCreatorProfile: false, useOwnArtifacts: false } : undefined;
  const entry = params.entry === "BREAKDOWN" ? "BREAKDOWN" : params.entry === "BENCHMARK" ? "BENCHMARK" : params.entry === "OPPORTUNITY" ? "OPPORTUNITY" : "DIRECT";
  return <div className="research-home">
    <header className="research-page-heading research-home-intro"><div><span className="research-eyebrow">研究中心 / 首页</span><h1>{starting ? "开始一次研究" : "接着上次的问题，往下研究。"}</h1><p>查看已有判断，跟进观察对象，也把新的问题留下来。</p></div></header>
    {requestedAccounts.length > 3 ? <p className="research-error" role="alert">一次最多选择 3 个对标账号，请缩小比较范围。</p> : null}
    {accounts.length !== accountIds.length ? <p className="research-error" role="alert">部分对标账号不可访问，请重新选择。</p> : null}
    {params.trend && !trend ? <p className="research-error" role="alert">所选趋势无法访问，请重新选择。</p> : null}
    {starting ? <ResearchComposer initialMaterials={selectedMaterial ? [selectedMaterial, ...materials.filter(item => item.id !== selectedMaterial.id)] : materials} initialAccounts={accounts} initialTrends={trend ? [trend] : []} initialScope={scope} initialEntry={entry} projectId={params.projectId} canWrite={role !== "VIEWER"} /> : null}
    <section className="research-section research-home-recents"><header><h2>继续研究</h2><span>仅你可见</span></header>
      {sessions.length ? <ul className="research-list">{sessions.slice(0, 5).map(item => <li key={item.id}><Link href={`/research/session/${item.id}`}><div className="research-row-title"><strong>{item.title}</strong><small>{RESEARCH_ENTRY_LABELS[item.entryTemplate as keyof typeof RESEARCH_ENTRY_LABELS] || "研究"}{item.projectId ? " · 来自项目" : ""}</small></div><small>{item.updatedAt.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</small><span className="research-status">{results.some(result => result.sessionId === item.id) ? "已保存成果" : "继续 →"}</span></Link></li>)}</ul> : <div className="research-center-empty"><h3>从一个值得弄清的问题开始</h3><p>选一份资料，或直接提问。研究过程会保存在这里，随时可以继续。</p></div>}
    </section>
    <section className="research-section research-home-saved"><header><h2>最近保存的判断</h2><Link href="/research/results">研究成果 →</Link></header>{results.length ? <ul className="research-list">{results.slice(0, 3).map(item => <li key={item.id}><Link href={`/research/results/run/${item.id}`}><strong>{item.resultTitle || item.question}</strong><small>{item.savedAt?.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</small><span>阅读 →</span></Link></li>)}</ul> : <p className="research-center-empty-inline">研究完成后，保存值得留下的结论，就能从这里重新找到。</p>}</section>
    <section className="research-section"><header><h2>最近更新的账号档案</h2><Link href="/research/benchmarks">对标账号库 →</Link></header>{updatedAccounts.length ? <ul className="research-list">{updatedAccounts.map(item => <li key={item.id}><Link href={`/research/benchmarks/${item.id}`}><strong>{item.name}</strong><small>{platformLabel[item.platform] || "其他平台"} · {item.updatedAt.toLocaleDateString("zh-CN")}</small><span>查看证据与研究 →</span></Link></li>)}</ul> : <p className="research-center-empty-inline">添加一个值得持续观察的账号，先从已掌握的证据开始。</p>}</section>
    <div className="research-home-bottom"><section className="research-section"><header><h2>最近查看的账号</h2><Link href="/research/benchmarks">全部 →</Link></header>{recent.accounts.length ? <ul className="research-list">{recent.accounts.slice(0, 3).map(item => <li key={item.id}><Link href={`/research/benchmarks/${item.id}`}><strong>{item.name}</strong><small>{platformLabel[item.platform] || "其他平台"}</small></Link></li>)}</ul> : <p className="research-center-empty-inline">到<Link href="/research/benchmarks">对标账号库</Link>，选一个长期观察的对象。</p>}</section>
    <section className="research-section"><header><h2>最近查看的趋势</h2><Link href="/research/trends">全部 →</Link></header>{recent.trends.length ? <ul className="research-list">{recent.trends.slice(0, 3).map(item => <li key={item.key}><Link href={`/research/trends/${item.key}`}><strong>{item.title}</strong><small>{item.observedAt.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</small></Link></li>)}</ul> : <p className="research-center-empty-inline">浏览<Link href="/research/trends">趋势</Link>，从变化中找到值得研究的问题。</p>}</section></div>
    {!starting ? <section id="new-research" className="research-section"><header><h2>开始新的研究</h2><span>从一个具体问题开始</span></header><ResearchComposer initialMaterials={selectedMaterial ? [selectedMaterial, ...materials.filter(item => item.id !== selectedMaterial.id)] : materials} initialAccounts={accounts} initialTrends={trend ? [trend] : []} initialScope={scope} initialEntry={entry} projectId={params.projectId} canWrite={role !== "VIEWER"} /></section> : null}
  </div>;
}
