import { Badge, Card } from "@content-center/ui";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LibraryPoller } from "@/components/library/library-poller";
import { SourceActions } from "@/components/library/source-actions";
import { requireWorkspace } from "@/server/access";
import { db, findSourceForUser } from "@content-center/db";

function duration(job: { startedAt: Date | null; finishedAt: Date | null }) {
  if (!job.startedAt) return "—";
  return `${Math.max(0, (job.finishedAt ?? new Date()).getTime() - job.startedAt.getTime())} ms`;
}

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, workspace } = await requireWorkspace();
  const { id } = await params;
  const [source, availableTags, availableCollections] = await Promise.all([
    findSourceForUser(db, { userId: session.user.id, workspaceId: workspace.id, sourceItemId: id }),
    db.contentTag.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
    db.collection.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
  ]);
  if (!source) notFound();
  const latestJob = source.ingestJobs[0];
  const isProcessing = source.status === "PENDING" || source.status === "PROCESSING";
  const isMock = source.transcript?.providerMode === "MOCK" || latestJob?.providerMode === "MOCK";
  const contentTitle = source.sourceType === "URL" ? "提取正文" : source.sourceType === "VIDEO" ? "Transcript" : "原始正文";

  return (
    <>
      <LibraryPoller active={isProcessing} />
      <Link href="/library" className="mb-5 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={16} />返回素材库</Link>
      <header className="mb-6">
        <div className="flex flex-wrap gap-2"><Badge>{source.sourcePlatform}</Badge><Badge>{source.sourceType}</Badge><Badge>{source.status}</Badge>{isMock ? <Badge className="border-[var(--warning)] text-[var(--warning)]">MOCK</Badge> : null}</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{source.title || "未命名素材"}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{source.author || "未知作者"} · {source.createdAt.toLocaleString("zh-CN")}</p>
        {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm text-[var(--accent)]">原始链接 <ExternalLink size={14} /></a> : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Card className="p-5">
            <h2 className="font-semibold">Source</h2>
            {source.thumbnailUrl ? <img src={source.thumbnailUrl} alt="" className="mt-4 max-h-80 w-full rounded-xl object-cover" /> : null}
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{source.description || "无描述"}</p>
            {source.metadata ? <details className="mt-4"><summary className="cursor-pointer text-sm">查看安全元数据</summary><pre className="mt-3 overflow-auto rounded-lg bg-[var(--surface-elevated)] p-3 text-xs">{JSON.stringify(source.metadata, null, 2)}</pre></details> : null}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">{contentTitle}</h2>
            {isProcessing ? <p className="mt-4 text-sm text-[var(--text-secondary)]">处理中，页面会自动刷新。</p> : <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7">{source.sourceType === "VIDEO" ? source.transcript?.fullText : source.rawText || "暂无正文"}</pre>}
          </Card>
          <Card className="overflow-hidden">
            <div className="border-b p-5"><h2 className="font-semibold">采集任务</h2></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[var(--surface-elevated)] text-[var(--text-secondary)]"><tr><th className="p-3">状态</th><th className="p-3">Provider</th><th className="p-3">模式</th><th className="p-3">Attempt</th><th className="p-3">耗时</th><th className="p-3">错误</th></tr></thead><tbody>{source.ingestJobs.map((job) => <tr key={job.id} className="border-t"><td className="p-3">{job.status}</td><td className="p-3">{job.provider}</td><td className="p-3">{job.providerMode}</td><td className="p-3">{job.attempt}/{job.maxAttempts}</td><td className="p-3">{duration(job)}</td><td className="p-3 text-[var(--danger)]">{job.errorMessage || "—"}</td></tr>)}</tbody></table></div>
          </Card>
        </div>
        <SourceActions sourceId={source.id} status={source.status} failedJobId={source.status === "FAILED" ? latestJob?.id : undefined} tags={source.tags.map(({ tag }) => tag)} availableTags={availableTags} collections={source.collections.map(({ collection }) => collection)} availableCollections={availableCollections} />
      </div>
    </>
  );
}
