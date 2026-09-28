import Link from "next/link";
import { requireWorkspace } from "@/server/access";
import { researchBenchmarkList } from "@/server/research/benchmarks";
import { platformLabel } from "@/components/research/research-labels";
import { BenchmarkAccountAdd } from "@/components/research/benchmark-account-add";

import { BenchmarkAccountTable } from "@/components/research/benchmark-tables";

type Query = { q?: string; platform?: string; category?: string; page?: string };
export default async function ResearchBenchmarks({ searchParams }: { searchParams: Promise<Query> }) {
  const { workspace, session, role } = await requireWorkspace();
  const query = await searchParams;
  const data = await researchBenchmarkList({ workspaceId: workspace.id, userId: session.user.id }, query);
  const href = (page: number) => { const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string")); params.set("page", String(page)); return `/research/benchmarks?${params}`; };
  return <div><header className="research-page-heading"><div><span className="research-eyebrow">研究中心 / 对标账号</span><h1>看懂别人，找到自己的方向。</h1><p>把值得研究的账号放在一起，用真实作品理解选题、表达与可迁移的方法。</p></div></header><BenchmarkAccountAdd canManage={role === "OWNER" || role === "ADMIN"} />
    <form className="research-toolbar research-filters"><label>查找账号<input type="search" name="q" defaultValue={query.q} placeholder="昵称或平台账号 ID" /></label><label>平台<select name="platform" defaultValue={query.platform || ""}><option value="">全部平台</option>{["DOUYIN", "XIAOHONGSHU", "WECHAT", "BILIBILI", "YOUTUBE", "TIKTOK", "GENERIC", "OTHER"].map(value => <option key={value} value={value}>{platformLabel[value] || value}</option>)}</select></label><label>分类<select name="category" defaultValue={query.category || ""}><option value="">全部分类</option>{data.categories.map(value => <option key={value} value={value}>{platformLabel[value] || value}</option>)}</select></label><button type="submit">筛选</button></form>
    <p className="research-caption">共 {data.count} 个账号 · 已发现作品与已收录资料分别统计；缺少采集批次时仅展示历史快照。</p>
    {data.items.length ? <BenchmarkAccountTable items={data.items} /> : <div className="research-center-empty"><h2>{query.q || query.platform || query.category ? "没有匹配的账号" : "还没有对标账号"}</h2><p>{query.q || query.platform || query.category ? "调整搜索或筛选条件，找回你想研究的对象。" : "用上方“发现并添加账号”寻找一个对象，再主动采集作品。"}</p>{query.q || query.platform || query.category ? <Link className="research-button" href="/research/benchmarks">清除筛选</Link> : null}</div>}
    {data.pages > 1 ? <nav className="research-pagination" aria-label="账号分页">{data.page > 1 ? <Link href={href(data.page - 1)}>上一页</Link> : null}<span>第 {data.page} / {data.pages} 页</span>{data.page < data.pages ? <Link href={href(data.page + 1)}>下一页</Link> : null}</nav> : null}
  </div>;
}
