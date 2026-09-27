import Link from "next/link";
import { requireWorkspace } from "@/server/access";
import { researchTrendList } from "@/server/research/trends";
import { TrendRefresh } from "@/components/research/trend-refresh";
import { platformLabel, trendTypeLabel } from "@/components/research/research-labels";

type Query = { q?: string; platform?: string; type?: string; state?: string; since?: string; page?: string };
const states: Record<string, string> = { FIRST_SEEN: "首次被本系统观察", RISING: "排名上升", PERSISTING: "持续观察" };
export default async function ResearchTrends({ searchParams }: { searchParams: Promise<Query> }) {
  const { workspace, session, role } = await requireWorkspace(); const query = await searchParams;
  const data = await researchTrendList({ workspaceId: workspace.id, userId: session.user.id }, query);
  const href = (page: number) => { const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string")); params.set("page", String(page)); return `/research/trends?${params}`; };
  return <div><header className="research-page-heading"><div><span className="research-eyebrow">保存的真实榜单快照</span><h1>趋势</h1><p>每条趋势使用稳定身份汇集历次快照；“新出现”只表示本系统首次观察，不代表事件刚发生。</p></div><TrendRefresh canWrite={role !== "VIEWER"} platform={query.platform || "ALL"} type={query.type || "HOT"} initialKeyword={query.q} /></header>
    <form className="research-toolbar research-filters"><label>查找趋势<input type="search" name="q" defaultValue={query.q} placeholder="标题或关键词" /></label><label>平台<select name="platform" defaultValue={query.platform || ""}><option value="">全部平台</option><option value="DOUYIN">抖音</option><option value="XIAOHONGSHU">小红书</option><option value="GLOBAL">全网</option></select></label><label>榜单类型<select name="type" defaultValue={query.type || ""}><option value="">全部类型</option><option value="HOT">热门</option><option value="SURGING">上升</option><option value="DARK_HORSE">黑马</option></select></label><label>观察状态<select name="state" defaultValue={query.state || ""}><option value="">全部状态</option><option value="FOLLOWED">我关注的</option>{Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>最近观察始于<input type="date" name="since" defaultValue={query.since} /></label><button type="submit">筛选</button></form>
    <p className="research-caption">共 {data.count} 条稳定趋势 · 排名表示平台榜单位置，排名变化只比较同一来源、平台、类型和外部标识的先后观察。</p>
    {data.items.length ? <ul className="research-results-list">{data.items.map(item => <li key={item.stableKey}><Link href={`/research/trends/${item.stableKey}`}><small>{platformLabel[item.platform] || "其他平台"} · {trendTypeLabel[item.trendType] || "榜单"} · {states[item.state]} · 最近观察 {item.observedAt.toLocaleString("zh-CN")}</small><h2>{item.title}</h2><p>当前排名 {item.rank ?? "未知"} · {item.rankDelta === null ? "暂无可比较的前次排名" : item.rankDelta > 0 ? `上升 ${item.rankDelta} 位` : item.rankDelta < 0 ? `下降 ${-item.rankDelta} 位` : "排名未变"} · 打开历史 →</p></Link></li>)}</ul> : <div className="research-center-empty"><h2>{query.q || query.platform || query.type || query.state || query.since ? "没有匹配的趋势" : "暂无趋势快照"}</h2><p>主动更新榜单后，真实 Provider 返回的数据会保存并出现在这里；Provider 不可用时仍可阅读历史快照。</p></div>}
    {data.pages > 1 ? <nav className="research-pagination" aria-label="趋势分页">{data.page > 1 ? <Link href={href(data.page - 1)}>上一页</Link> : null}<span>第 {data.page} / {data.pages} 页</span>{data.page < data.pages ? <Link href={href(data.page + 1)}>下一页</Link> : null}</nav> : null}
  </div>;
}
