import Link from "next/link";
import { requireWorkspace } from "@/server/access";
import { researchBenchmarkList } from "@/server/research/benchmarks";
import { collectionStatusLabel, platformLabel } from "@/components/research/research-labels";
import { BenchmarkAccountAdd } from "@/components/research/benchmark-account-add";

type Query = { q?: string; platform?: string; category?: string; page?: string };
export default async function ResearchBenchmarks({ searchParams }: { searchParams: Promise<Query> }) {
  const { workspace, session, role } = await requireWorkspace();
  const query = await searchParams;
  const data = await researchBenchmarkList({ workspaceId: workspace.id, userId: session.user.id }, query);
  const href = (page: number) => { const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string")); params.set("page", String(page)); return `/research/benchmarks?${params}`; };
  return <div><header className="research-page-heading"><div><span className="research-eyebrow">真实采集 · 长期观察</span><h1>对标账号</h1><p>按账号查看作品、采集范围与历史研究。账号资料属于工作空间，研究会话仍归发起人所有。</p></div></header><BenchmarkAccountAdd canManage={role === "OWNER" || role === "ADMIN"} />
    <form className="research-toolbar research-filters"><label>查找账号<input type="search" name="q" defaultValue={query.q} placeholder="昵称或平台账号 ID" /></label><label>平台<select name="platform" defaultValue={query.platform || ""}><option value="">全部平台</option>{["DOUYIN", "XIAOHONGSHU", "WECHAT", "BILIBILI", "YOUTUBE", "TIKTOK", "GENERIC", "OTHER"].map(value => <option key={value} value={value}>{value}</option>)}</select></label><label>分类<select name="category" defaultValue={query.category || ""}><option value="">全部分类</option>{data.categories.map(value => <option key={value} value={value}>{value}</option>)}</select></label><button type="submit">筛选</button></form>
    <p className="research-caption">共 {data.count} 个账号 · 已发现作品与已收录资料分别统计；缺少采集批次时仅展示历史快照。</p>
    {data.items.length ? <form action="/research" method="get"><input type="hidden" name="entry" value="BENCHMARK" /><ul className="research-account-list">{data.items.map(item => <li key={item.id}><label className="research-account-select"><input type="checkbox" name="accounts" value={item.id} aria-label={`选择 ${item.name} 研究`} /></label><Link href={`/research/benchmarks/${item.id}`}><span className="research-account-avatar" aria-hidden>{item.name.slice(0, 1)}</span><span className="research-account-name"><strong>{item.name}</strong><small>{platformLabel[item.platform] || "其他平台"}{item.researchCategory ? ` · ${item.researchCategory}` : ""}</small></span><span className="research-account-facts"><span>{item._count.contentSnapshots} 条已发现作品</span><span>{item.materialCount} 条已收录资料</span><small>{item.collectionRuns[0] ? `最近采集：${collectionStatusLabel[item.collectionRuns[0].status] || "状态待确认"} · ${item.collectionRuns[0].createdAt.toLocaleDateString("zh-CN")}` : "尚无采集批次"}</small></span><span className="research-account-open">打开 →</span></Link></li>)}</ul><p className="research-caption">最多选择 3 个账号。跨平台比较会提示统计口径差异。</p><button type="submit">研究选中账号 →</button></form> : <div className="research-center-empty"><h2>{query.q || query.platform || query.category ? "没有匹配的账号" : "还没有对标账号"}</h2><p>添加账号后，已保存的作品和采集记录会出现在这里。</p></div>}
    {data.pages > 1 ? <nav className="research-pagination" aria-label="账号分页">{data.page > 1 ? <Link href={href(data.page - 1)}>上一页</Link> : null}<span>第 {data.page} / {data.pages} 页</span>{data.page < data.pages ? <Link href={href(data.page + 1)}>下一页</Link> : null}</nav> : null}
  </div>;
}
