import { Badge, Card } from "@content-center/ui";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LibraryPoller } from "@/components/library/library-poller";
import { SourceActions } from "@/components/library/source-actions";
import { TranscriptionActions } from "@/components/library/transcription-actions";
import { getSourceProcessingState, type ProcessingStepState } from "@/lib/source-processing-state";
import { sourcePlatformLabels, sourceStatusLabels, sourceTypeLabels } from "@/lib/content-labels";
import { requireWorkspace } from "@/server/access";
import { db, findSourceForUser } from "@content-center/db";
import { IntegrationService, parseProviderConfig } from "@content-center/integrations";
import { minioStorageFromEnv } from "@content-center/providers";
import { getLocalAsrDisplay } from "@/server/local-asr";

function duration(job: { startedAt: Date | null; finishedAt: Date | null }) {
  if (!job.startedAt) return "—";
  return `${Math.max(0, (job.finishedAt ?? new Date()).getTime() - job.startedAt.getTime())} ms`;
}

function formatBytes(value: bigint | null) {
  if (value === null) return "—";
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

const progressLabels: Record<string, string> = {
  RESOLVING: "正在解析抖音链接",
  FETCHING_METADATA: "正在获取视频信息",
  DOWNLOADING_MEDIA: "正在保存视频",
  STORING: "正在写入素材存储",
  DONE: "已完成",
  QUEUED: "等待转写",
  EXTRACTING_AUDIO: "正在提取音频",
  UPLOADING_AUDIO: "正在保存音频",
  TRANSCRIBING: "正在转写",
  PERSISTING: "正在保存转写结果",
  SUCCEEDED: "转写完成",
};

const stepStateLabels: Record<ProcessingStepState, string> = {
  WAITING: "等待",
  PROCESSING: "处理中",
  SUCCEEDED: "已完成",
  FAILED: "失败",
  SKIPPED: "已跳过",
};

function formatTimestamp(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function transcriptSegments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((segment) => {
    if (!segment || typeof segment !== "object") return [];
    const candidate = segment as Record<string, unknown>;
    if (typeof candidate.startMs !== "number" || typeof candidate.endMs !== "number" || typeof candidate.text !== "string") return [];
    return [{ startMs: candidate.startMs, endMs: candidate.endMs, text: candidate.text }];
  });
}

function jsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const qualityLabels: Record<string, string> = { FAST: "速度优先", BALANCED: "均衡", QUALITY: "质量优先" };

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, workspace, role } = await requireWorkspace();
  const { id } = await params;
  const [source, availableTags, availableCollections, availableProjects] = await Promise.all([
    findSourceForUser(db, { userId: session.user.id, workspaceId: workspace.id, sourceItemId: id }),
    db.contentTag.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
    db.collection.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
    db.contentProject.findMany({
      where: { workspaceId: workspace.id, status: { not: "ARCHIVED" }, sources: { none: { sourceItemId: id } } },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);
  if (!source) notFound();
  const latestIngestJob = source.ingestJobs.find((job) => job.jobType !== "TRANSCRIBE");
  const latestTranscriptionJob = source.ingestJobs.find((job) => job.jobType === "TRANSCRIBE");
  const transcriptionBusy = latestTranscriptionJob?.status === "QUEUED" || latestTranscriptionJob?.status === "RUNNING";
  const isMock = source.transcript?.providerMode === "MOCK" || latestIngestJob?.providerMode === "MOCK";
  const contentTitle = source.sourceType === "URL" ? "提取正文" : "原始正文";
  const storedAssets = source.assets.filter((asset) => asset.status === "STORED" && asset.storageKey && asset.assetType !== "AUDIO");
  const storage = storedAssets.length ? minioStorageFromEnv() : null;
  const playableAssets = await Promise.all(storedAssets.map(async (asset) => ({
    ...asset,
    signedUrl: (await storage!.getSignedUrl(asset.storageKey!, 300)).data.url,
  })));
  const progressJob = transcriptionBusy ? latestTranscriptionJob : latestIngestJob;
  const jobMetadata = progressJob?.metadata && typeof progressJob.metadata === "object" && !Array.isArray(progressJob.metadata)
    ? progressJob.metadata as Record<string, unknown>
    : {};
  const progressStage = typeof jobMetadata.progressStage === "string" ? jobMetadata.progressStage : undefined;
  const integrationService = new IntegrationService();
  const [doubao, transcription, localAsr] = source.sourcePlatform === "DOUYIN"
    ? await Promise.all([
        integrationService.getIntegrationStatus(workspace.id, "DOUBAO_ASR"),
        integrationService.getIntegrationStatus(workspace.id, "TRANSCRIPTION"),
        getLocalAsrDisplay(workspace.id),
      ])
    : [null, null, null];
  const transcriptionConfig = parseProviderConfig("TRANSCRIPTION", transcription?.publicConfig ?? {}) as { source: "LOCAL_FUNASR" | "DOUBAO"; qualityMode: "FAST" | "BALANCED" | "QUALITY" };
  const selectedLocalQuality = localAsr?.qualityModes[transcriptionConfig.qualityMode];
  const transcriptionConfigured = transcriptionConfig.source === "DOUBAO"
    ? doubao?.status === "CONFIGURED"
    : localAsr?.status === "NORMAL" && selectedLocalQuality?.available === true && selectedLocalQuality.installed;
  const processing = getSourceProcessingState({
    sourceStatus: source.status,
    transcriptionStatus: transcriptionConfigured ? "CONFIGURED" : "UNCONFIGURED",
    hasTranscript: Boolean(source.transcript),
    assets: source.assets,
    jobs: source.ingestJobs,
  });
  const isProcessing = processing.busy;
  const canTranscribe = role !== "VIEWER";
  const segments = transcriptSegments(source.transcript?.segments);
  const transcriptMetadata = jsonObject(source.transcript?.metadata);
  const transcriptTechnical = jsonObject(transcriptMetadata.technical);
  const pipelineSteps = [
    ["RedFox 解析", processing.steps.redfoxParse],
    ["视频保存", processing.steps.videoSave],
    ["音频提取", processing.steps.audioExtraction],
    ["AI 转写", processing.steps.aiTranscription],
  ] as const;

  return (
    <>
      <LibraryPoller active={isProcessing} />
      <Link href="/library" className="mb-5 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={16} />返回素材库</Link>
      <header className="mb-6">
        <div className="flex flex-wrap gap-2"><Badge>{sourcePlatformLabels[source.sourcePlatform] || source.sourcePlatform}</Badge><Badge>{sourceTypeLabels[source.sourceType] || source.sourceType}</Badge><Badge>{sourceStatusLabels[source.status] || source.status}</Badge>{isMock ? <Badge className="border-[var(--warning)] text-[var(--warning)]">MOCK MODE</Badge> : null}</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{source.title || "未命名素材"}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{source.author || "未知作者"} · {source.createdAt.toLocaleString("zh-CN")}</p>
        {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm text-[var(--accent)]">原始链接 <ExternalLink size={14} /></a> : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          {source.sourcePlatform === "DOUYIN" ? (
            <Card className="p-5">
              <h2 className="font-semibold">处理进度</h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {pipelineSteps.map(([label, state], index) => (
                  <li key={label} className="rounded-xl border bg-[var(--surface-elevated)] p-3">
                    <span className="text-xs text-[var(--text-secondary)]">步骤 {index + 1}</span>
                    <div className="mt-1 flex items-center justify-between gap-2"><span className="text-sm font-medium">{label}</span><Badge>{stepStateLabels[state]}</Badge></div>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
          <Card className="p-5">
            <h2 className="font-semibold">素材概览</h2>
            {playableAssets.map((asset) => asset.assetType === "VIDEO" ? (
              <video key={asset.id} controls preload="metadata" className="mt-4 max-h-[32rem] w-full rounded-xl bg-black" src={asset.signedUrl}>您的浏览器不支持视频播放。</video>
            ) : (
              <img key={asset.id} src={asset.signedUrl} alt={source.title || "抖音图文素材"} className="mt-4 max-h-[32rem] w-full rounded-xl object-contain" />
            ))}
            {playableAssets.length === 0 && source.thumbnailUrl ? <img src={source.thumbnailUrl} alt="" className="mt-4 max-h-80 w-full rounded-xl object-cover" /> : null}
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{source.description || "无描述"}</p>
            {source.metadata ? <details className="mt-4"><summary className="cursor-pointer text-sm">查看安全元数据</summary><pre className="mt-3 overflow-auto rounded-lg bg-[var(--surface-elevated)] p-3 text-xs">{JSON.stringify(source.metadata, null, 2)}</pre></details> : null}
          </Card>
          {source.sourcePlatform === "DOUYIN" ? (
            <Card className="p-5">
              <h2 className="font-semibold">抖音素材信息</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-[var(--text-secondary)]">平台</dt><dd className="mt-1">抖音</dd></div>
                <div><dt className="text-[var(--text-secondary)]">采集服务</dt><dd className="mt-1">RedFox · 真实模式</dd></div>
                <div><dt className="text-[var(--text-secondary)]">内容类型</dt><dd className="mt-1">{sourceTypeLabels[source.sourceType] || source.sourceType}</dd></div>
                <div><dt className="text-[var(--text-secondary)]">保存时间</dt><dd className="mt-1">{source.updatedAt.toLocaleString("zh-CN")}</dd></div>
              </dl>
              <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-[var(--text-secondary)]"><tr><th className="pb-2">Asset</th><th className="pb-2">状态</th><th className="pb-2">MIME</th><th className="pb-2">大小</th><th className="pb-2">Stored At</th></tr></thead><tbody>{source.assets.map((asset) => <tr key={asset.id} className="border-t"><td className="py-3">{asset.assetType}</td><td>{asset.status}</td><td>{asset.mimeType || "—"}</td><td>{formatBytes(asset.sizeBytes)}</td><td>{asset.storedAt?.toLocaleString("zh-CN") || "—"}</td></tr>)}</tbody></table></div>
            </Card>
          ) : null}
          {source.sourcePlatform === "DOUYIN" ? (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">视频转写</h2>
                <Badge>{processing.transcriptionLabel}</Badge>
              </div>
              {transcriptionBusy ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{progressStage ? progressLabels[progressStage] || progressStage : "转写处理中，页面会自动刷新。"}</p> : null}
              {!transcriptionConfigured && !source.transcript ? (
                <p className="mt-4 text-sm text-[var(--text-secondary)]">
                  视频已保存。{transcriptionConfig.source === "LOCAL_FUNASR"
                    ? localAsr?.status !== "NORMAL" ? "本地语音识别服务未启动。" : "当前质量模式所需模型尚未安装或硬件不支持。"
                    : doubao?.status === "DISABLED" ? "豆包 ASR 已禁用。" : "豆包 ASR 未配置。"}
                  {canTranscribe ? <Link href="/settings/integrations" className="ml-2 font-medium text-[var(--accent)]">配置后转写</Link> : null}
                </p>
              ) : null}
              {latestTranscriptionJob?.status === "FAILED" ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{latestTranscriptionJob.errorMessage || "转写失败，请重试。"}</p> : null}
              {source.transcript ? (
                <>
                  <dl className="mt-4 grid gap-3 rounded-xl bg-[var(--surface-elevated)] p-4 text-sm sm:grid-cols-3">
                    <div><dt className="text-[var(--text-secondary)]">方式</dt><dd className="mt-1">{typeof transcriptMetadata.methodLabel === "string" ? transcriptMetadata.methodLabel : source.transcript.provider === "LOCAL_FUNASR" ? "本地转写" : "豆包云端"}</dd></div>
                    <div><dt className="text-[var(--text-secondary)]">质量</dt><dd className="mt-1">{qualityLabels[String(transcriptMetadata.qualityMode)] ?? "—"}</dd></div>
                    <div><dt className="text-[var(--text-secondary)]">耗时</dt><dd className="mt-1">{typeof transcriptMetadata.processingMs === "number" ? `${Math.round(transcriptMetadata.processingMs / 1_000)} 秒` : "—"}</dd></div>
                  </dl>
                  <h3 className="mt-5 text-sm font-medium text-[var(--text-secondary)]">全文</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{source.transcript.fullText}</p>
                  {segments.length ? (
                    <div className="mt-6 grid gap-4 border-t pt-5">
                      {segments.map((segment, index) => (
                        <div key={`${segment.startMs}-${segment.endMs}-${index}`} className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)]">
                          <span className="font-mono text-xs text-[var(--text-secondary)]">{formatTimestamp(segment.startMs)} - {formatTimestamp(segment.endMs)}</span>
                          <p className="text-sm leading-6">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : transcriptionConfigured && !transcriptionBusy && latestTranscriptionJob?.status !== "FAILED" ? <p className="mt-4 text-sm text-[var(--text-secondary)]">视频已保存，尚未转写。</p> : null}
              <TranscriptionActions sourceId={source.id} canTranscribe={canTranscribe} configured={transcriptionConfigured} hasTranscript={Boolean(source.transcript)} fullText={source.transcript?.fullText} busy={transcriptionBusy} />
            </Card>
          ) : (
            <Card className="p-5">
              <h2 className="font-semibold">{contentTitle}</h2>
              {isProcessing ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{progressStage ? progressLabels[progressStage] || progressStage : "处理中，页面会自动刷新。"}</p> : <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7">{source.rawText || "暂无正文"}</pre>}
            </Card>
          )}
          <Card className="overflow-hidden"><details><summary className="cursor-pointer list-none p-5"><h2 className="font-semibold">高级信息与处理记录</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">仅在排查采集或转写问题时需要查看。</p></summary><div className="overflow-x-auto border-t"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[var(--surface-elevated)] text-[var(--text-secondary)]"><tr><th className="p-3">任务</th><th className="p-3">状态</th><th className="p-3">服务</th><th className="p-3">模式</th><th className="p-3">尝试次数</th><th className="p-3">耗时</th><th className="p-3">错误</th></tr></thead><tbody>{source.ingestJobs.map((job) => <tr key={job.id} className="border-t"><td className="p-3">{job.jobType}</td><td className="p-3">{job.status}</td><td className="p-3">{job.provider}</td><td className="p-3">{job.providerMode}</td><td className="p-3">{job.attempt}/{job.maxAttempts}</td><td className="p-3">{duration(job)}</td><td className="p-3 text-[var(--danger)]">{job.errorMessage || "—"}</td></tr>)}</tbody></table></div>{Object.keys(transcriptTechnical).length ? <div className="border-t p-5"><h3 className="text-sm font-medium">高级处理信息</h3><pre className="mt-3 overflow-auto rounded-lg bg-[var(--surface-elevated)] p-3 text-xs">{JSON.stringify(transcriptTechnical, null, 2)}</pre></div> : null}</details></Card>
        </div>
        <SourceActions sourceId={source.id} status={source.status} failedJobId={source.status === "FAILED" ? latestIngestJob?.id : undefined} tags={source.tags.map(({ tag }) => tag)} availableTags={availableTags} collections={source.collections.map(({ collection }) => collection)} availableCollections={availableCollections} availableProjects={availableProjects} canManageProjects={role !== "VIEWER"} />
      </div>
    </>
  );
}
