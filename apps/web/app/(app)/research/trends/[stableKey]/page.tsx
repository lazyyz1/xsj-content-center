import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/server/access";
import { ResearchError } from "@/server/research/access";
import { researchTrendDetail } from "@/server/research/trends";
import { researchObjectPreference } from "@/server/research/preferences";
import { ResearchObjectActions } from "@/components/research/research-object-actions";
import { TrendRelatedSearch } from "@/components/research/trend-related-search";
import { platformLabel, trendTypeLabel } from "@/components/research/research-labels";

export default async function ResearchTrendDetail({ params, searchParams }: { params: Promise<{ stableKey: string }>; searchParams: Promise<{ page?: string }> }) {
  const { workspace, session, role } = await requireWorkspace(); const { stableKey } = await params; const query = await searchParams;
  let data: Awaited<ReturnType<typeof researchTrendDetail>>;
  try { data = await researchTrendDetail({ workspaceId: workspace.id, userId: session.user.id }, stableKey, Number(query.page) || 1); }
  catch (error) { if (error instanceof ResearchError && error.status === 404) notFound(); throw error; }
  const preference = await researchObjectPreference({ workspaceId: workspace.id, userId: session.user.id }, "TREND", stableKey);
  const date = (value: Date) => value.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  return <div><header className="research-page-heading"><div><Link href="/research/trends">← 趋势</Link><span className="research-eyebrow">{platformLabel[data.platform] || "其他平台"} · {trendTypeLabel[data.trendType] || "榜单"} · 数据来源 {data.identity.provider}</span><h1>{data.title}</h1><p>这是历次保存的榜单观察。首次观察时间 {date(data.firstObservedAt)}；不推断事件发生时间。</p><Link href={`/research?entry=OPPORTUNITY&trend=${encodeURIComponent(stableKey)}`}>基于此趋势研究选题 →</Link></div><ResearchObjectActions kind="TREND" objectKey={stableKey} followed={Boolean(preference?.followedAt)} showFollow /></header>
    <section className="research-section"><header><h2>当前真实数据</h2><span>最近快照 · {date(data.latest.observedAt)}</span></header><div className="research-account-metrics"><div><strong>{data.latest.rank ?? "—"}</strong><span>当前榜单排名</span></div><div><strong>{data.rankDelta === null ? "—" : data.rankDelta > 0 ? `+${data.rankDelta}` : data.rankDelta}</strong><span>相比前次排名变化</span></div><div><strong>{data.latest.metrics.contentCount ?? "—"}</strong><span>来源内容数</span></div><div><strong>{data.latest.metrics.likes ?? "—"}</strong><span>来源点赞计数</span></div></div><p className="research-caption">数据观察时间 {date(data.latest.observedAt)}；来源窗口 {date(data.latest.windowStart)} 至 {date(data.latest.windowEnd)}。缺失值显示为“—”。排名变化仅以同身份更早快照为基准；不同平台的指标不可直接比较。</p></section>
    <section className="research-section"><header><h2>排名与快照历史</h2><span>共 {data.count} 次观察</span></header>{data.snapshots.length ? <div className="research-table-scroll"><table><thead><tr><th>观察时间</th><th>来源窗口</th><th>排名</th><th>内容数</th><th>点赞</th><th>评论</th></tr></thead><tbody>{data.snapshots.map(snapshot => <tr key={snapshot.id}><td>{date(snapshot.observedAt)}</td><td>{date(snapshot.windowStart)} 至 {date(snapshot.windowEnd)}</td><td>{snapshot.rank ?? "缺失"}</td><td>{snapshot.metrics.contentCount ?? "缺失"}</td><td>{snapshot.metrics.likes ?? "缺失"}</td><td>{snapshot.metrics.comments ?? "缺失"}</td></tr>)}</tbody></table></div> : null}{data.pages > 1 ? <nav className="research-pagination" aria-label="历史快照分页">{data.page > 1 ? <Link href={`/research/trends/${stableKey}?page=${data.page - 1}`}>较新观察</Link> : null}<span>第 {data.page} / {data.pages} 页</span>{data.page < data.pages ? <Link href={`/research/trends/${stableKey}?page=${data.page + 1}`}>更早观察</Link> : null}</nav> : null}</section>
    <section className="research-section"><header><h2>相关作品与已观察作者</h2><span>证据范围</span></header><TrendRelatedSearch stableKey={stableKey} canWrite={role !== "VIEWER"} /></section>
    <section className="research-section"><header><h2>已保存的研究</h2><Link href={`/research/results?trendKey=${encodeURIComponent(stableKey)}`}>查看成果库 →</Link></header>{data.savedRuns.length ? <ul className="research-list">{data.savedRuns.map(run => <li key={run.id}><Link href={`/research/results/run/${run.id}`}><strong>{run.resultTitle || run.question}</strong><small>{run.savedAt?.toLocaleDateString("zh-CN")}</small></Link></li>)}</ul> : <p className="research-center-empty-inline">尚未保存关于此趋势的私人研究成果。</p>}</section>
    <section className="research-section"><header><h2>继续研究</h2><span>用户主动触发</span></header><p className="research-caption">从这个趋势提出问题，研究会话会记录所用快照与证据缺口。选题机会应包含观众任务、收益、角度和下一步验证动作。</p><Link href={`/research?entry=OPPORTUNITY&trend=${encodeURIComponent(stableKey)}`}>研究此趋势 / 找选题 →</Link></section>
  </div>;
}
