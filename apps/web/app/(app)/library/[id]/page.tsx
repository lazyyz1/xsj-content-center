import { Badge, Card } from "@content-center/ui";
import { ArrowLeft, ExternalLink, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MaterialAnalysisCard } from "@/components/library/material-analysis-card";
import { MaterialDistillationCard } from "@/components/library/material-distillation-card";
import { MaterialWorkspace } from "@/components/library/material-workspace";
import { MetadataRefreshButton } from "@/components/library/metadata-refresh-button";
import { SourceActions } from "@/components/library/source-actions";
import { SourceProcessingPoller } from "@/components/library/source-processing-poller";
import { TranscriptPanel } from "@/components/library/transcript-panel";
import { SourceAssetDownloadButton } from "@/components/library/source-asset-download-button";
import { sourcePlatformLabels, sourceStatusLabels, sourceTypeLabels } from "@/lib/content-labels";
import { exactMetricCount, formatMetricCount } from "@/lib/format-metric-count";
import { getSourceProcessingState, type ProcessingStepState } from "@/lib/source-processing-state";
import { buildMaterialWorkspaceState } from "@/lib/material-workspace-state";
import { getMaterialDistillation } from "@/server/material-distillation/service";
import { requireWorkspace } from "@/server/access";
import { getLocalAsrDisplay } from "@/server/local-asr";
import { getMaterialAnalysis } from "@/server/material-analysis/service";
import { db, findSourceForUser } from "@content-center/db";
import { IntegrationService, parseProviderConfig } from "@content-center/integrations";
import { getStorageProvider, readSourceMetadataEnvelope } from "@content-center/providers";
import { sourceDisplayName } from "@/lib/content-production";

function jsonObject(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function formatBytes(value: bigint | null) { if (value === null) return "—"; const bytes = Number(value); return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / 1024 / 1024).toFixed(1)} MiB`; }
function formatDuration(milliseconds: number | null) { if (milliseconds === null) return "数据服务未返回"; const seconds = Math.max(0, Math.round(milliseconds / 1000)); return seconds >= 60 ? `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒` : `${seconds} 秒`; }
function jobDuration(job: { startedAt: Date | null; finishedAt: Date | null }) { return job.startedAt ? `${Math.max(0, (job.finishedAt ?? new Date()).getTime() - job.startedAt.getTime())} ms` : "—"; }
const stepLabels: Record<ProcessingStepState, string> = { WAITING: "等待", PROCESSING: "处理中", SUCCEEDED: "已完成", FAILED: "失败", SKIPPED: "已跳过" };
const qualityLabels: Record<string, string> = { FAST: "速度优先", BALANCED: "均衡", QUALITY: "质量优先" };

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, workspace, role } = await requireWorkspace();
  const { id } = await params;
  const [source, availableTags, availableCollections, availableProjects, relatedProjects, relatedIdeas] = await Promise.all([
    findSourceForUser(db, { userId: session.user.id, workspaceId: workspace.id, sourceItemId: id }),
    db.contentTag.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
    db.collection.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
    db.contentProject.findMany({ where: { workspaceId: workspace.id, status: { not: "ARCHIVED" }, sources: { none: { sourceItemId: id } } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    db.contentProject.findMany({ where: { workspaceId: workspace.id, status: { not: "ARCHIVED" }, sources: { some: { sourceItemId: id } } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" } }),
    db.contentIdea.findMany({ where: { workspaceId: workspace.id, references: { some: { sourceItemId: id } } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  if (!source) notFound();
  const integration = new IntegrationService();
  const [analysisState, distillationState, llm] = await Promise.all([getMaterialAnalysis({ workspaceId: workspace.id, sourceItemId: source.id }), getMaterialDistillation({ workspaceId: workspace.id, sourceItemId: source.id }), integration.getIntegrationStatus(workspace.id, "LLM")]);
  const displayName = sourceDisplayName({ title: source.title, suggestedTitle: analysisState.current?.suggestedTitle, summary: analysisState.current?.understanding?.whatItSays.summary || analysisState.current?.summary, platformLabel: sourcePlatformLabels[source.sourcePlatform] || source.sourcePlatform, createdAt: source.createdAt });
  const latestIngest = source.ingestJobs.find((job) => job.jobType !== "TRANSCRIBE");
  const latestTranscription = source.ingestJobs.find((job) => job.jobType === "TRANSCRIBE");
  const transcriptionBusy = latestTranscription?.status === "QUEUED" || latestTranscription?.status === "RUNNING";
  const stored = source.assets.filter((asset) => asset.status === "STORED" && asset.storageKey && asset.assetType !== "AUDIO");
  const storage = stored.length ? getStorageProvider() : null;
  const playable = await Promise.all(stored.map(async (asset) => ({ ...asset, signedUrl: (await storage!.getSignedUrl(asset.storageKey!, 300, {
    assetScope: { workspaceId: workspace.id, sourceItemId: source.id, assetId: asset.id },
  })).data.url })));
  const [doubao, transcription, localAsr] = source.sourcePlatform === "DOUYIN" ? await Promise.all([integration.getIntegrationStatus(workspace.id, "DOUBAO_ASR"), integration.getIntegrationStatus(workspace.id, "TRANSCRIPTION"), getLocalAsrDisplay(workspace.id)]) : [null, null, null];
  const transcriptionConfig = parseProviderConfig("TRANSCRIPTION", transcription?.publicConfig ?? {}) as { source: "LOCAL_FUNASR" | "DOUBAO"; qualityMode: "FAST" | "BALANCED" | "QUALITY" };
  const selectedQuality = localAsr?.qualityModes[transcriptionConfig.qualityMode];
  const transcriptionConfigured = transcriptionConfig.source === "DOUBAO" ? doubao?.status === "CONFIGURED" : localAsr?.status === "NORMAL" && selectedQuality?.available === true && selectedQuality.installed;
  const processing = getSourceProcessingState({ sourceStatus: source.status, transcriptionStatus: transcriptionConfigured ? "CONFIGURED" : "UNCONFIGURED", hasTranscript: Boolean(source.transcript), assets: source.assets, jobs: source.ingestJobs });
  const transcriptMetadata = jsonObject(source.transcript?.metadata);
  const transcriptTechnical = jsonObject(transcriptMetadata.technical);
  const metadata = readSourceMetadataEnvelope(source.metadata)?.external ?? null;
  const visibleMetrics = metadata ? ([["播放", metadata.metrics.views], ["点赞", metadata.metrics.likes], ["收藏", metadata.metrics.favorites], ["评论", metadata.metrics.comments], ["分享", metadata.metrics.shares]] as const).flatMap(([label, value]) => value === null ? [] : [[label, value] as const]) : [];
  const canRefresh = role !== "VIEWER" && source.sourceProvider === "REDFOX" && ["DOUYIN", "XIAOHONGSHU"].includes(source.sourcePlatform) && Boolean(source.externalId || source.sourceUrl || source.canonicalUrl);
  const pipeline = [["RedFox 解析", processing.steps.redfoxParse], [source.sourceType === "IMAGE" ? "图片保存" : "视频保存", processing.steps.videoSave], ["音频提取", processing.steps.audioExtraction], ["语音转写", processing.steps.aiTranscription]] as const;
  const sourceUrl = metadata?.originalUrl || source.sourceUrl || source.canonicalUrl;
  const sourceReference = source.sourceProvider === "REDFOX" && (source.sourcePlatform === "DOUYIN" || source.sourcePlatform === "XIAOHONGSHU") && sourceUrl ? {
    externalId: source.externalId || source.id, platform: source.sourcePlatform, contentType: source.sourceType === "VIDEO" || source.sourceType === "IMAGE" ? source.sourceType : source.sourceType === "URL" ? "ARTICLE" as const : "UNKNOWN" as const,
    title: source.title, description: source.description, authorId: metadata?.authorId ?? null, authorName: source.author, authorAvatarUrl: metadata?.authorAvatarUrl ?? null, coverUrl: source.thumbnailUrl, originalUrl: sourceUrl,
    publishedAt: metadata?.publishedAt ?? null, metrics: metadata?.metrics ?? { views: null, likes: null, comments: null, shares: null, favorites: null }, durationMs: metadata?.durationMs ?? null, sourceProvider: "REDFOX" as const,
  } : null;

  const classification = <SourceActions sourceId={source.id} status={source.status} tags={source.tags.map(({ tag }) => tag)} availableTags={availableTags} collections={source.collections.map(({ collection }) => collection)} availableCollections={availableCollections} availableProjects={availableProjects} canManageProjects={role !== "VIEWER"} mode="CLASSIFICATION" />;
  const creation = <SourceActions sourceId={source.id} status={source.status} tags={[]} availableTags={[]} collections={[]} availableCollections={[]} availableProjects={availableProjects} canManageProjects={role !== "VIEWER"} mode="CREATION" relatedProjects={relatedProjects} relatedIdeas={relatedIdeas} sourceTitle={displayName} sourceReference={sourceReference} />;
  const information = <div className="grid gap-4" data-testid="source-external-metadata"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">作品信息</h3>{canRefresh ? <MetadataRefreshButton sourceId={source.id} /> : null}</div><dl className="grid grid-cols-2 gap-3 text-sm"><Info label="作者" value={metadata?.authorName || source.author} /><Info label="平台" value={sourcePlatformLabels[source.sourcePlatform] || source.sourcePlatform} /><Info label="发布时间" value={metadata?.publishedAt ? new Date(metadata.publishedAt).toLocaleString("zh-CN") : null} /><Info label="视频时长" value={formatDuration(metadata?.durationMs ?? null)} /><Info label="数据更新时间" value={metadata?.providerFetchedAt ? new Date(metadata.providerFetchedAt).toLocaleString("zh-CN") : null} /></dl>{visibleMetrics.length ? <dl className="grid grid-cols-3 gap-2">{visibleMetrics.map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--surface-elevated)] p-2"><dt className="text-xs text-[var(--text-secondary)]">{label}</dt><dd className="mt-1 text-sm font-semibold" title={`精确值 ${exactMetricCount(value)}`}>{formatMetricCount(value)}</dd></div>)}</dl> : null}<details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">更多信息</summary><dl className="mt-3 grid gap-3 text-sm"><Info label="原始标题" value={metadata?.originalTitle || source.title} /><Info label="描述" value={source.description} /><Info label="作品 ID" value={source.externalId} /><Info label="作者 ID" value={metadata?.authorId} /></dl>{sourceUrl ? <a className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--accent)]" href={sourceUrl} target="_blank" rel="noreferrer">原始链接 <ExternalLink size={14} /></a> : null}</details>{classification}</div>;
  const processingPanel = <div className="grid gap-4" data-testid="source-processing-status"><div><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">处理进度</h3><Badge>{processing.currentLabel}</Badge></div><ol className="mt-3 grid gap-2">{pipeline.map(([label, state]) => <li key={label} className="flex items-center justify-between rounded-lg bg-[var(--surface-elevated)] p-3 text-sm"><span>{state === "SUCCEEDED" ? "✓ " : state === "FAILED" ? "! " : "○ "}{label}</span><Badge>{stepLabels[state]}</Badge></li>)}</ol></div>{latestTranscription?.status === "FAILED" ? <p className="text-sm text-[var(--danger)]">{latestTranscription.errorMessage || "转写失败，请重试。"}</p> : null}{role === "OWNER" || role === "ADMIN" ? <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">高级处理信息</summary><div className="mt-3 grid gap-2 text-xs text-[var(--text-secondary)]">{source.ingestJobs.map((job) => <p key={job.id}>{job.jobType} · {job.status} · {job.providerMode} · {jobDuration(job)}</p>)}{source.assets.map((asset) => <p key={asset.id}>{asset.assetType} · {asset.status} · {formatBytes(asset.sizeBytes)}</p>)}</div>{Object.keys(transcriptTechnical).length ? <pre className="mt-3 overflow-auto rounded-lg bg-[var(--surface-elevated)] p-3 text-xs">{JSON.stringify(transcriptTechnical, null, 2)}</pre> : null}</details> : null}</div>;
  const organize = <><MaterialAnalysisCard sourceId={source.id} current={analysisState.current} latestAttempt={analysisState.latestAttempt} job={analysisState.job} history={analysisState.history} canEdit={role !== "VIEWER"} llmStatus={llm.status} hasTranscript={Boolean(source.transcript)} embedded showCreateAction={false} />{source.sourceType === "VIDEO" ? <MaterialDistillationCard sourceId={source.id} current={distillationState.current} latestAttempt={distillationState.latestAttempt} job={distillationState.job} history={distillationState.history} canEdit={role !== "VIEWER"} llmStatus={llm.status} hasTranscript={Boolean(source.transcript)} /> : null}</>;
  const transcriptionMessage = transcriptionBusy
    ? "转写处理中，完成后会自动显示。"
    : latestTranscription?.status === "FAILED"
      ? `转写失败：${latestTranscription.errorMessage || "请重试。"}`
      : !transcriptionConfigured
        ? "语音转写服务暂时不可用，请联系管理员。"
        : !source.transcript
          ? "视频已保存，尚未转写。"
          : undefined;
  const workspaceProps = { ...buildMaterialWorkspaceState({ storedAssets: stored.length, sourceStatus: source.status, hasTranscript: Boolean(source.transcript), analysisStatus: analysisState.current?.status, relatedProjects: relatedProjects.length }), organize, information, creation, processing: processingPanel };

  return <>
    <SourceProcessingPoller sourceId={source.id} active={processing.busy || analysisState.latestAttempt?.status === "PROCESSING" || analysisState.job?.status === "QUEUED" || analysisState.job?.status === "RUNNING" || distillationState.latestAttempt?.status === "PROCESSING" || distillationState.job?.status === "QUEUED" || distillationState.job?.status === "RUNNING"} />
    <Link href="/library" className="mb-5 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]"><ArrowLeft size={16} />返回素材库</Link>
    <header className="mb-6 flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge>{sourcePlatformLabels[source.sourcePlatform] || source.sourcePlatform}</Badge><Badge>{sourceTypeLabels[source.sourceType] || source.sourceType}</Badge><Badge>{sourceStatusLabels[source.status] || source.status}</Badge></div><h1 className="mt-3 text-3xl font-semibold tracking-tight">{displayName}</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">{source.author || "未知作者"} · {source.createdAt.toLocaleString("zh-CN")}</p></div><details className="relative shrink-0"><summary aria-label="更多操作" className="cursor-pointer list-none rounded-full border p-2"><MoreHorizontal size={20} /></summary><div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border bg-[var(--surface)] p-3 shadow-xl"><SourceActions sourceId={source.id} status={source.status} failedJobId={source.status === "FAILED" ? latestIngest?.id : undefined} tags={[]} availableTags={[]} collections={[]} availableCollections={[]} availableProjects={[]} canManageProjects={role !== "VIEWER"} mode="DANGER" /></div></details></header>
    <div className="grid items-start gap-6 min-[901px]:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)] xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <main className="grid min-w-0 gap-6"><Card className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">素材概览</h2>{stored.find((asset) => asset.assetType === "VIDEO") ? <SourceAssetDownloadButton sourceId={source.id} assetId={stored.find((asset) => asset.assetType === "VIDEO")!.id} /> : null}</div>{playable.map((asset) => asset.assetType === "VIDEO" ? <video key={asset.id} controls preload="metadata" className="mt-4 max-h-[32rem] w-full rounded-xl bg-black" src={asset.signedUrl} /> : <img key={asset.id} src={asset.signedUrl} alt={source.title || "素材"} className="mt-4 max-h-[32rem] w-full rounded-xl object-contain" />)}{!playable.length && source.thumbnailUrl ? <img src={source.thumbnailUrl} alt="" className="mt-4 max-h-80 w-full rounded-xl object-cover" /> : null}</Card>{source.sourcePlatform === "DOUYIN" ? <TranscriptPanel sourceId={source.id} status={processing.transcriptionLabel} method={typeof transcriptMetadata.methodLabel === "string" ? transcriptMetadata.methodLabel : source.transcript?.provider === "LOCAL_FUNASR" ? "本地转写" : source.transcript ? "豆包云端" : "—"} quality={qualityLabels[String(transcriptMetadata.qualityMode)] ?? "—"} processingTime={typeof transcriptMetadata.processingMs === "number" ? `${Math.round(transcriptMetadata.processingMs / 1000)} 秒` : "—"} fullText={source.transcript?.fullText} canEdit={role !== "VIEWER"} canTranscribe={role !== "VIEWER"} configured={transcriptionConfigured} busy={transcriptionBusy} message={transcriptionMessage} /> : <Card className="p-5"><h2 className="font-semibold">{source.sourceType === "URL" ? "提取正文" : "原始正文"}</h2><div className="mt-4 h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl bg-[var(--surface-elevated)] p-4 text-sm leading-7">{source.rawText || "暂无正文"}</div></Card>}</main>
      <MaterialWorkspace {...workspaceProps} />
    </div>
  </>;
}

function Info({ label, value }: { label: string; value: string | null | undefined }) { return <div><dt className="text-xs text-[var(--text-secondary)]">{label}</dt><dd className="mt-1 break-words">{value || "数据服务未返回"}</dd></div>; }
