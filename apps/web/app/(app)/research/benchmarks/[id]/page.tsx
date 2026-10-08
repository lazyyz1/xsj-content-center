import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { isLocalReviewOffline } from "@content-center/providers";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/server/access";
import { canAddResearchAccount } from "@/server/experience-account";
import { benchmarkWorkbench } from "@/server/research/benchmark-workbench";
import { researchWorkInbox } from "@/server/research/read-model";
import { BenchmarkPurpose, BenchmarkSync } from "@/components/research/benchmark-workbench-actions";
import { BenchmarkWorkList } from "@/components/research/benchmark-work-list";
import { platformLabel } from "@/components/research/research-labels";
import "@/components/research/benchmark-workbench.css";
export default async function AccountDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string; workQuery?: string; readiness?: string; order?: string; view?: string }> }) {
  const { id } = await params, query = await searchParams, { workspace, session, role } = await requireWorkspace(), actor = { workspaceId: workspace.id, userId: session.user.id };
  const [board, queue] = await Promise.all([benchmarkWorkbench(actor, { accountId: id, period: query.period }), researchWorkInbox(actor, { accountId: id, includeDismissed: true })]);
  const account = board.cards.find(card => card.id === id); if (!account) notFound();
  const period = query.period || "all", externalAvailable = !isLocalReviewOffline();
  return <article className="research-account-desk">
    <Link className="research-desk-back" href="/research/benchmarks"><ArrowLeft size={15} />全部对标与作品</Link>
    <header className="research-account-detail-heading"><span className="research-account-monogram">{account.name.slice(0, 1)}</span><div><span className="research-desk-kicker">{platformLabel[account.platform] || account.platform} · 账号作品</span><h1>{account.name}</h1><p>已保存 {account._count.contentSnapshots} 条作品 · {account.purpose === "teacher" ? "学方法" : account.purpose === "reference" ? "找题材" : "未分类也可以阅读"}</p></div><form><label>作品范围<select aria-label="作品周期" name="period" defaultValue={period}><option value="all">全部已保存</option><option value="30">最近 30 天</option><option value="7">最近一周</option></select></label><button type="submit">应用</button></form></header>
    <div className="research-account-context"><span><strong>{account.baseline.median === null ? "—" : account.baseline.median.toLocaleString()}</strong> 点赞中位数</span><span><strong>{account.baseline.samples}</strong> 有效样本</span><span><strong>{account.highCount}</strong> 条超过 2.5× 基准</span><details className="research-account-settings"><summary>账号与同步设置</summary><div><BenchmarkPurpose id={id} purpose={account.purpose} /><BenchmarkSync ids={[id]} canWrite={canAddResearchAccount(role, session.user)} externalAvailable={externalAvailable} />{account.originalUrl && /^https:\/\//.test(account.originalUrl) ? <a href={account.originalUrl} target="_blank" rel="noopener noreferrer">账号原主页 <ArrowUpRight size={14} /></a> : null}<p>最后同步：{account.lastSyncedAt ? account.lastSyncedAt.toLocaleString("zh-CN", { timeZone: "Asia/Singapore" }) : "尚未同步"}</p><p>平台身份：{account.externalAccountId}</p><p>每账号最多读取最近 200 条；至少 5 个有效样本后计算倍数。缺少数据不补算。</p></div></details></div>
    <nav className="research-account-detail-tabs" aria-label="账号观察范围"><span aria-current="page">作品与阅读</span><Link href={"/research/benchmarks/"+id+"/analysis"}>账号观察与可学方法 →</Link></nav>
    <BenchmarkWorkList works={board.works} statuses={queue.items.map(item => ({ id: item.id, reportId: item.reportId, readable: item.readable, read: item.read, followed: item.followed, dismissed: item.dismissed }))} returnTo={"/research/benchmarks/" + id + "?period=" + period + "#works"} initialView={query.view} initialQuery={query.workQuery} initialFilter={query.readiness} initialSort={query.order} />
    <details className="research-desk-data"><summary>如何理解这些数据</summary><p>作品的相对表现使用同账号、当前周期的点赞中位数。高倍数值得进一步阅读，但不能单凭它断定爆款原因、播放或转化。{!externalAvailable ? "当前展示已保存内容，同步待接入。" : ""}</p></details>
  </article>;
}
