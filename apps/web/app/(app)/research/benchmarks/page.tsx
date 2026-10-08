import { isLocalReviewOffline } from "@content-center/providers";
import { requireWorkspace } from "@/server/access";
import { canAddResearchAccount } from "@/server/experience-account";
import { benchmarkWorkbench } from "@/server/research/benchmark-workbench";
import { researchWorkInbox } from "@/server/research/read-model";
import { BenchmarkAccountAdd } from "@/components/research/benchmark-account-add";
import { BenchmarkAccountOverview } from "@/components/research/benchmark-account-overview";
import { BenchmarkWorkList } from "@/components/research/benchmark-work-list";
import "@/components/research/benchmark-workbench.css";
type Query = { q?: string; platform?: string; period?: string; accountId?: string; threshold?: string; viral?: string; sort?: string; purpose?: string; workQuery?: string; readiness?: string; order?: string; view?: string; page?: string };
export default async function ResearchBenchmarks({ searchParams }: { searchParams: Promise<Query> }) {
  const { workspace, session, role } = await requireWorkspace(), query = await searchParams, actor = { workspaceId: workspace.id, userId: session.user.id };
  // Account statistics use the selected period; client filters never change the denominator.
  const data = await benchmarkWorkbench(actor, { ...query, accountId: undefined, viral: "all" });
  const inbox = await researchWorkInbox(actor, { includeDismissed: true, workIds: data.works.map(work => work.id) });
  const canWrite = canAddResearchAccount(role, session.user), externalAvailable = !isLocalReviewOffline("RESEARCH_COLLECTION");
  const filters = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const accounts = data.cards.map(card => ({ id: card.id, name: card.name, platform: card.platform, purpose: card.purpose, savedCount: card._count.contentSnapshots, lastSyncedAt: card.lastSyncedAt?.toISOString() ?? null, latestPublishedAt: card.works.filter(work => work.publishedAt).map(work => work.publishedAt!).sort().at(-1) ?? null, median: card.baseline.median, samples: card.baseline.samples, highCount: card.highCount, trend: card.trend, syncStatus: card.collectionRuns[0]?.status ?? null, originalUrl: card.originalUrl }));
  return <article className="research-benchmark-desk">
    <header className="research-desk-heading"><div><h1>对标与作品</h1><p>选择值得学的人，再挑值得研究的内容。</p></div><BenchmarkAccountAdd canManage={canWrite} externalAvailable={externalAvailable} /></header>
    <BenchmarkAccountOverview accounts={accounts} canWrite={canWrite} externalAvailable={externalAvailable} selectedId={query.accountId}/>
    <BenchmarkWorkList key={JSON.stringify(query)} works={data.works} statuses={inbox.items.map(item => ({ id: item.id, reportId: item.reportId, readable: item.readable, read: item.read, followed: item.followed, dismissed: item.dismissed }))} returnTo={"/research/benchmarks?" + filters + "#works"} initialView={query.view} initialAccountId={query.accountId} initialQuery={query.workQuery} initialFilter={query.readiness} initialSort={query.order || (query.sort === "heat" ? "likes" : query.sort === "time" ? "newest" : "multiple")} initialPeriod={data.days ? String(data.days) : "all"} initialViral={query.viral} threshold={data.threshold} initialPage={Number(query.page) || 1}/>
    <details className="research-desk-data"><summary>数据范围与同步说明</summary><p>手动同步近期一页，按需继续获取。读取每账号最多最近 200 条、最多 100 个账号。{data.bounded ? "当前已达到读取上限。" : ""}曲线表示不同作品的已知点赞，非粉丝增长。供应商快照可能滞后，缺失数据不补算。</p></details>
  </article>;
}
