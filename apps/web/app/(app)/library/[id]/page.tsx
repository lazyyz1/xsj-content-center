import { Card } from "@content-center/ui";
import { ArrowLeft, ExternalLink, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MaterialAnalysisCard } from "@/components/library/material-analysis-card";
import { MaterialDistillationCard } from "@/components/library/material-distillation-card";
import { MaterialKnowledgeCard } from "@/components/library/material-knowledge-card";
import { MaterialWorkspace } from "@/components/library/material-workspace";
import { MetadataRefreshButton } from "@/components/library/metadata-refresh-button";
import { SourceActions } from "@/components/library/source-actions";
import { SourceAssetDownloadButton } from "@/components/library/source-asset-download-button";
import { SourceProcessingPoller } from "@/components/library/source-processing-poller";
import { TranscriptPanel } from "@/components/library/transcript-panel";
import { employeeSourceMeta, sourcePlatformLabels, sourceStatusLabels } from "@/lib/content-labels";
import { formatMetricCount } from "@/lib/format-metric-count";
import { sourceDisplayName } from "@/lib/content-production";
import { requireWorkspace } from "@/server/access";
import { getMaterialDetailView } from "@/server/material-detail/service";

function formatDuration(milliseconds: number | null) {
  if (milliseconds === null) return "暂未记录";
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒` : `${seconds} 秒`;
}

function formatSegmentTime(milliseconds: number | null) {
  if (milliseconds === null) return "--:--";
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const metricLabels = [
  ["views", "播放"],
  ["likes", "点赞"],
  ["comments", "评论"],
  ["favorites", "收藏"],
  ["shares", "分享"],
] as const;

type ProcessingDisplayState = "DONE" | "PROCESSING" | "FAILED" | "WAITING";

function ProcessingStep({ label, state, detail }: { label: string; state: ProcessingDisplayState; detail: string }) {
  const icon = state === "DONE" ? "✓" : state === "FAILED" ? "!" : state === "PROCESSING" ? "…" : "○";
  return <div className={`material-processing-step is-${state.toLowerCase()}`}><span aria-hidden="true">{icon}</span><div><strong>{label}</strong><small>{detail}</small></div></div>;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN") : "暂未记录";
}

function jobDuration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt) return "未开始";
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  return formatDuration(Math.max(0, end - start));
}

export default async function SourceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ previewState?: string }> }) {
  const { session, workspace, role } = await requireWorkspace();
  const { id } = await params;
  const query = await searchParams;
  const previewState = process.env.NODE_ENV !== "production" && (query.previewState === "TRANSCRIBING" || query.previewState === "TRANSCRIPT_ONLY" || query.previewState === "M1_ONLY") ? query.previewState : null;
  const previewTranscribing = previewState === "TRANSCRIBING";
  const previewTranscriptOnly = previewState === "TRANSCRIPT_ONLY";
  const previewM1Only = previewState === "M1_ONLY";
  const view = await getMaterialDetailView({ workspaceId: workspace.id, userId: session.user.id, sourceItemId: id, role });
  if (!view) notFound();

  const { source, understanding, distillation, evidence, workflow, transcript, processing } = view;
  const hasConfirmableInformation = evidence.confirmableItems.length > 0;
  const displayName = sourceDisplayName({ title: source.title, suggestedTitle: understanding.current?.suggestedTitle, summary: understanding.summary, platformLabel: sourcePlatformLabels[source.platform] || source.platform, createdAt: new Date(source.createdAt) });
  const sourceReference = source.sourceProvider === "REDFOX" && source.originalUrl ? {
    externalId: source.externalId || source.id,
    platform: source.platform as "DOUYIN" | "XIAOHONGSHU",
    contentType: source.sourceType === "VIDEO" || source.sourceType === "IMAGE" ? source.sourceType : source.sourceType === "URL" ? "ARTICLE" as const : "UNKNOWN" as const,
    title: source.title,
    description: source.description,
    authorId: source.authorId,
    authorName: source.author,
    authorAvatarUrl: source.authorAvatar,
    coverUrl: source.cover,
    originalUrl: source.originalUrl,
    publishedAt: source.publishedAt,
    metrics: source.engagement,
    durationMs: source.durationMs,
    sourceProvider: "REDFOX" as const,
  } : null;

  const classification = <SourceActions sourceId={source.id} status={source.status} tags={source.tags} availableTags={workflow.availableTags} collections={source.collections} availableCollections={workflow.availableCollections} availableProjects={workflow.availableProjects} canManageProjects={role !== "VIEWER"} mode="CLASSIFICATION" />;
  const topicInspiration = source.sourceType === "VIDEO" ? { available: workflow.availableTopicAction, unavailableMessage: transcript.text ? "这条资料暂时还不能直接找选题。" : "请先完成视频文字稿。" } : undefined;
  const creation = <SourceActions sourceId={source.id} status={source.status} tags={[]} availableTags={[]} collections={[]} availableCollections={[]} availableProjects={workflow.availableProjects} canManageProjects={role !== "VIEWER"} mode="CREATION" relatedProjects={workflow.currentProjects.map(({ id: projectId, title }) => ({ id: projectId, title }))} relatedIdeas={workflow.relatedTopics.map(({ id: topicId, title }) => ({ id: topicId, title }))} sourceTitle={displayName} sourceReference={sourceReference} topicInspiration={topicInspiration} />;
  const visibleMetrics = metricLabels.flatMap(([key, label]) => {
    const value = source.engagement[key];
    return value === null ? [] : [{ key, label, value }];
  });
  const information = <section id="material-metadata-summary" className="material-metadata-summary" data-testid="source-external-metadata"><header><div><h2>作品信息</h2><p>{source.metadataCompleteness.complete ? "资料信息已补全。" : "已有信息来自真实来源；缺少部分可以补全。"}</p></div>{source.refresh.available ? <MetadataRefreshButton sourceId={source.id} /> : null}</header><div className="material-metadata-grid"><Info label="作者" value={source.author} /><Info label="平台" value={employeeSourceMeta(source.sourceType, source.platform)} /><Info label="发布时间" value={source.publishedAt ? new Date(source.publishedAt).toLocaleString("zh-CN") : null} /><Info label="视频时长" value={formatDuration(source.durationMs)} /><Info label="描述" value={source.description} /><Info label="原始链接" value={source.originalUrl ? "已保存原始来源" : null} /></div>{visibleMetrics.length ? <div className="material-engagement-grid" aria-label="互动数据">{visibleMetrics.map(({ key, label, value }) => <div key={key}><span>{label}</span><strong title={value.toLocaleString("zh-CN")}>{formatMetricCount(value)}</strong></div>)}</div> : null}{source.authorAvatar ? <div className="material-author-proof"><img src={source.authorAvatar} alt="" /><span>来源作者头像已保存</span></div> : null}</section>;
  const analysisBusy = understanding.latestAttempt?.status === "PROCESSING" || understanding.job?.status === "QUEUED" || understanding.job?.status === "RUNNING";
  const analysisFailed = !analysisBusy && understanding.latestAttempt?.status === "FAILED";
  const distillationBusy = distillation.latestAttempt?.status === "PROCESSING" || distillation.job?.status === "QUEUED" || distillation.job?.status === "RUNNING";
  const distillationFailed = !distillationBusy && distillation.latestAttempt?.status === "FAILED";
  const processingSteps = <div className="material-processing-steps">
    <ProcessingStep label="资料准备" state={source.status === "READY" ? "DONE" : source.status === "PROCESSING" ? "PROCESSING" : source.status === "FAILED" ? "FAILED" : "WAITING"} detail={source.status === "READY" ? "原始资料已经准备好" : source.status === "PROCESSING" ? "资料正在准备中" : source.status === "FAILED" ? "资料准备失败，可以重试" : "资料还没有准备好"} />
    <ProcessingStep label="文字稿" state={transcript.transcriptionState === "COMPLETED" ? "DONE" : transcript.transcriptionState === "PROCESSING" ? "PROCESSING" : transcript.transcriptionState === "FAILED" ? "FAILED" : "WAITING"} detail={transcript.transcriptionState === "COMPLETED" ? "可以查看、复制或编辑" : transcript.transcriptionState === "PROCESSING" ? "完成后会自动显示" : transcript.transcriptionState === "FAILED" ? "文字稿生成失败，可以重新转写" : transcript.transcriptionState === "UNAVAILABLE" ? "语音转写服务暂时不可用，请联系管理员" : "尚未生成，可以从下方开始"} />
    <ProcessingStep label="内容理解" state={understanding.current?.status === "COMPLETED" ? "DONE" : analysisBusy ? "PROCESSING" : analysisFailed ? "FAILED" : "WAITING"} detail={understanding.current?.status === "COMPLETED" ? "摘要、观点和表达线索已经整理好" : analysisBusy ? "正在整理这条内容" : analysisFailed ? "内容理解失败，可以重新分析" : "完成文字稿后可以开始"} />
    {source.sourceType === "VIDEO" ? <ProcessingStep label="内容提炼" state={distillation.current?.status === "COMPLETED" && distillation.current.output ? "DONE" : distillationBusy ? "PROCESSING" : distillationFailed ? "FAILED" : "WAITING"} detail={distillation.current?.status === "COMPLETED" && distillation.current.output ? distillation.current.stale ? "已有结果，文字稿更新后可重新提炼" : "可以查看并保存值得学习的方法" : distillationBusy ? "正在整理值得学习的内容" : distillationFailed ? "内容提炼失败，可以重试" : view.llmStatus !== "CONFIGURED" ? "内容提炼暂不可用，请联系管理员检查 AI 服务" : "完成文字稿后可以开始"} /> : null}
  </div>;
  const processingPanel = <section className="material-processing-summary" data-testid="source-processing-status"><h3>资料处理</h3>{processingSteps}</section>;
  const processingDetails = processing.adminDetails ? <details className="material-processing-details"><summary>处理详情</summary><p>仅用于排查资料处理问题。</p><div className="material-processing-detail-list">{processing.adminDetails.jobs.map((job) => <article key={job.id}><strong>{job.jobType}</strong><span>{job.status} · {job.provider} · {job.providerMode}</span><small>开始：{formatDate(job.startedAt)} · 结束：{formatDate(job.finishedAt)} · 耗时：{jobDuration(job.startedAt, job.finishedAt)}</small>{job.errorCode ? <small>错误标识：{job.errorCode}{job.errorMessage ? ` · ${job.errorMessage}` : ""}</small> : null}</article>)}</div>{processing.adminDetails.assets.length ? <details><summary>保存的文件</summary><div className="material-processing-detail-list">{processing.adminDetails.assets.map((asset, index) => <article key={`${asset.assetType}-${index}`}><strong>{asset.assetType}</strong><span>{asset.status} · {asset.sizeBytes ? `${asset.sizeBytes} bytes` : "大小未记录"}</span></article>)}</div></details> : null}{processing.adminDetails.transcript ? <details><summary>文字稿处理信息</summary><p>方式：{processing.adminDetails.transcript.provider}</p><pre>{JSON.stringify(processing.adminDetails.transcript.metadata, null, 2)}</pre></details> : null}</details> : null;
  const showDistillation = source.sourceType === "VIDEO" && !previewTranscriptOnly && !previewM1Only;
  const organize = <><MaterialAnalysisCard sourceId={source.id} current={previewTranscriptOnly ? null : understanding.current} latestAttempt={previewTranscriptOnly ? null : understanding.latestAttempt} job={previewTranscriptOnly ? null : understanding.job} history={previewTranscriptOnly ? [] : understanding.history} canEdit={role !== "VIEWER"} llmStatus={view.llmStatus} hasTranscript={Boolean(transcript.text)} embedded showCreateAction={false} compact /><MaterialKnowledgeCard sourceId={source.id} initial={evidence.state} editable={role !== "VIEWER"} />{showDistillation ? <MaterialDistillationCard sourceId={source.id} current={distillation.current} latestAttempt={distillation.latestAttempt} job={distillation.job} history={distillation.history} canEdit={role !== "VIEWER"} llmStatus={view.llmStatus} hasTranscript={Boolean(transcript.text)} /> : null}</>;
  const creationActions = <details id="material-creation-actions" className="material-creation-actions"><summary>进入创作</summary><div>{creation}</div></details>;
  const sourceMedia = source.mediaAssets.filter((asset) => asset.url);
  const videoAsset = source.mediaAssets.find((asset) => asset.assetType === "VIDEO" && asset.status === "STORED");
  const transcriptStatus = previewTranscribing ? "正在转写" : transcript.transcriptionState === "COMPLETED" ? "已完成" : transcript.transcriptionState === "PROCESSING" ? "处理中" : transcript.transcriptionState === "FAILED" ? "需要重试" : "尚未准备";
  const transcriptPreview = transcript.segments.slice(0, 3);
  const workflowContext = { ...workflow, metadata: { state: source.refresh.state, missing: source.metadataCompleteness.missing }, pendingEvidenceCount: hasConfirmableInformation ? evidence.state.candidates.filter((candidate) => candidate.status === "PENDING").length : 0, sourceBoundary: "外部资料只作为参考，不会自动成为我方事实。" };
  const workspaceProps = { saved: source.status === "READY", transcribed: Boolean(transcript.text), organized: !previewTranscriptOnly && understanding.current?.status === "COMPLETED", inProject: !previewTranscriptOnly && !previewM1Only && workflow.currentProjects.length > 0, distilled: !previewTranscriptOnly && !previewM1Only && distillation.current?.status === "COMPLETED" && Boolean(distillation.current.output), topicCount: previewTranscriptOnly || previewM1Only ? 0 : workflow.relatedTopics.length, transcriptionState: previewTranscribing ? "PROCESSING" as const : transcript.transcriptionState, organize, information, creation, processing: processingPanel, recommendedAction: workflow.recommendedAction, workflowContext };
  const settingsPanel = <details className="source-settings-popover"><summary aria-label="更多资料设置" className="source-more-button"><MoreHorizontal size={20} /></summary><div className="source-settings-popover-body"><section><h2>资料设置</h2><p>管理归类、标签、资料集与当前处理情况。</p></section><section><h3>归类与标签</h3>{classification}</section>{information}<section><h3>处理情况</h3>{processingSteps}{processingDetails}</section><section><h3>危险操作</h3><SourceActions sourceId={source.id} status={source.status} failedJobId={source.status === "FAILED" ? processing.ingestJobId ?? undefined : undefined} tags={[]} availableTags={[]} collections={[]} availableCollections={[]} availableProjects={[]} canManageProjects={role !== "VIEWER"} mode="DANGER" /></section></div></details>;

  return <><SourceProcessingPoller sourceId={source.id} active={processing.sourceStatus === "PROCESSING" || transcript.busy || understanding.latestAttempt?.status === "PROCESSING" || distillation.latestAttempt?.status === "PROCESSING"} /><div className="source-detail-workbench"><Link href="/library" className="source-back-link"><ArrowLeft size={16} />返回资料</Link><header className="source-detail-header"><div className="min-w-0"><div className="source-detail-header-meta"><span>{employeeSourceMeta(source.sourceType, source.platform)}</span><span>{source.author || "未知作者"}</span><span>{source.publishedAt ? new Date(source.publishedAt).toLocaleDateString("zh-CN") : "发布时间待补全"}</span>{source.durationMs !== null ? <span>{formatDuration(source.durationMs)}</span> : null}{previewState ? <span>状态预览 · {previewTranscribing ? "正在转写" : previewM1Only ? "仅看懂结果" : "仅文字稿"}</span> : null}</div><h1>{displayName}</h1><p>{source.description || "基于真实来源，整理可用于创作的内容理解。"}{source.originalUrl ? <> · <a href={source.originalUrl} target="_blank" rel="noreferrer">打开原始来源 <ExternalLink size={13} /></a></> : null}</p></div><div className="source-detail-header-actions"><span className="source-detail-status">{source.status === "READY" ? "内容已准备好" : sourceStatusLabels[source.status] || "资料处理中"}</span>{settingsPanel}</div></header><div className="source-reading-layout"><aside className="source-media-column"><Card className="source-media-card"><h2>原始素材</h2>{sourceMedia.map((asset) => asset.assetType === "VIDEO" ? <video key={asset.id} controls preload="metadata" src={asset.url ?? undefined} /> : <img key={asset.id} src={asset.url ?? undefined} alt={source.title || "素材"} />)}{!sourceMedia.length && source.cover ? <img src={source.cover} alt={source.title || "素材封面"} /> : null}<div className="source-media-meta"><strong>{source.title || "未命名资料"}</strong>{source.authorAvatar ? <img src={source.authorAvatar} alt="" /> : null}<span>{source.author || "未知作者"}</span><span>{employeeSourceMeta(source.sourceType, source.platform)}</span>{source.publishedAt ? <span>{new Date(source.publishedAt).toLocaleDateString("zh-CN")}</span> : null}{source.durationMs !== null ? <span>{formatDuration(source.durationMs)}</span> : null}</div>{source.description ? <p>{source.description}</p> : <p>原始资料用于核对内容来源。</p>}{visibleMetrics.length ? <div className="source-media-engagement">{visibleMetrics.map(({ key, label, value }) => <span key={key}><small>{label}</small><strong>{formatMetricCount(value)}</strong></span>)}</div> : null}{source.originalUrl ? <a className="source-original-link" href={source.originalUrl} target="_blank" rel="noreferrer">打开原始来源 <ExternalLink size={14} /> </a> : null}{videoAsset ? <SourceAssetDownloadButton sourceId={source.id} assetId={videoAsset.id} /> : null}{source.refresh.available ? <div className="source-media-refresh"><MetadataRefreshButton sourceId={source.id} /></div> : null}</Card></aside><main className="material-understanding-column"><div className="material-understanding-heading"><span>✦</span><div><h2>AI 已帮你看完这条内容</h2><p>从内容主题、结构亮点、受众反应等维度为你提炼关键信息</p></div></div>{organize}{processingPanel}{creationActions}</main><MaterialWorkspace {...workspaceProps} creation={null} variant="rail" recommendedAction={workflow.recommendedAction} workflowContext={workflowContext} /><main className="source-transcript-column"><details id="material-transcript-disclosure" className="material-transcript-disclosure"><summary><span>文字稿</span><small>{transcript.text ? `${transcript.wordCount.toLocaleString("zh-CN")} 字` : "完成转写后可展开核对"}</small><div className="material-transcript-preview">{transcriptPreview.length ? transcriptPreview.map((segment) => <span key={`${segment.index}-${segment.startMs ?? "na"}`}><time>{formatSegmentTime(segment.startMs)}</time>{segment.text}</span>) : <span>暂无可预览文字稿</span>}</div><strong>展开全文</strong></summary><div className="material-transcript-disclosure-body">{source.sourceType === "VIDEO" ? <TranscriptPanel sourceId={source.id} status={transcriptStatus} method={transcript.method} quality={transcript.quality} processingTime={transcript.processingTime} updatedAt={transcript.updatedAt ? formatDate(transcript.updatedAt) : undefined} fullText={previewTranscribing ? undefined : transcript.text ?? undefined} canEdit={transcript.editable} canTranscribe={transcript.editable} configured={transcript.configured} busy={transcript.busy || previewTranscribing} failed={!previewTranscribing && transcript.failed} preview={previewTranscribing} message={previewTranscribing ? undefined : transcript.message} compact /> : <Card className="source-document-body"><h2>{source.sourceType === "URL" ? "提取正文" : "原始正文"}</h2><div>{transcript.text || "暂无正文"}</div></Card>}</div></details></main></div></div></>;
}

function Info({ label, value }: { label: string; value: string | null | undefined }) { return <div><dt>{label}</dt><dd>{value || "暂未记录"}</dd></div>; }
