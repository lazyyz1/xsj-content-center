"use client";
import { ArrowLeft, Download, ExternalLink, FileText, MessageSquare, PencilLine, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { SourceWorkspaceModel } from "@/server/material-detail/read-model";
import { SourceProcessingPoller } from "../library/source-processing-poller";
import { SourceActions } from "../library/source-actions";
import { LibraryCardMenu } from "../library/library-card-controls";
import { NameDialog } from "../sidebar/name-dialog";
import { useSidebarLockController } from "../app-shell";
import { ProjectPicker } from "./project-picker";
import { MaterialAdminDetails } from "./material-admin-details";
import { SourceViewer } from "./source-viewer";
import { SourceText } from "./source-text";
import "./source-workspace.css";

export function SourceWorkspace({ model }: { model: SourceWorkspaceModel }) {
  const { detail, actions, workspace, adminDetails } = model;
  const { header, transcript } = detail;
  const router = useRouter();
  const lock = useSidebarLockController();
  const detailsRef = useRef<HTMLDialogElement>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [viewerHeight, setViewerHeight] = useState(480);
  const [focusText, setFocusText] = useState(false);
  const [railTab, setRailTab] = useState<"info" | "processing">("info");
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [canSeek, setCanSeek] = useState(false);
  const [tab, setTab] = useState<"text" | "original">("text");
  const [rename, setRename] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const canManage = actions.canManageProjects;
  const media = detail.preview.type === "VIDEO" || detail.preview.type === "AUDIO";
  const processing = workspace?.busy || transcript.state === "PROCESSING";
  const textLabel = media ? "转录文本" : detail.preview.type === "TEXT" ? "原始文字" : "提取文本";
  async function request(url: string, method = "POST", body?: unknown) {
    const response = await fetch(url, { method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.error || "操作失败，请稍后重试。");
    return result as { id?: string };
  }
  async function run(key: string, work: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(key); setNotice("");
    try { await work(); setNotice(message); router.refresh(); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "操作失败"); }
    finally { setBusy(null); }
  }
  async function conversation() {
    const project = await request("/api/projects", "POST", { title: header.title.slice(0, 200), sourceItemId: header.id });
    if (!project.id) throw new Error("创建对话失败");
    window.dispatchEvent(new Event("project-list-changed"));
    router.push(`/dashboard?project=${project.id}`);
  }
  const stateLabel = processing ? "处理中" : transcript.text ? "已完成" : transcript.state === "FAILED" ? "处理失败" : "未处理";
  return <div className={`source-workspace ${focusText ? "is-reading" : ""} ${!showProperties ? "is-properties-hidden" : ""}`} data-testid="source-workspace">
    <SourceProcessingPoller sourceId={header.id} active={Boolean(processing)} />
    <header className="source-workspace-header"><nav aria-label="面包屑"><Link href="/library"><ArrowLeft size={14} />资料库</Link><span>›</span><span>{header.typeLabel}</span><span>›</span><span>资料详情</span></nav>
      <div className="source-workspace-title"><div><div className="source-title-line"><h1>{header.title}</h1>{canManage ? <button type="button" aria-label="编辑资料标题" onClick={() => setRename(true)}><PencilLine size={16} /></button> : null}</div><div className="source-workspace-meta"><span>{header.typeLabel}</span>{detail.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}{header.durationLabel ? <small>{header.durationLabel}</small> : null}{workspace?.sizeLabel ? <small>{workspace.sizeLabel}</small> : null}{workspace?.createdAt ? <small>导入于 {new Date(workspace.createdAt).toLocaleDateString("zh-CN")}</small> : null}</div></div>
        <div className="source-workspace-actions">{header.originalUrl ? <a href={header.originalUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />原始来源</a> : null}{canManage && actions.status !== "ARCHIVED" ? <><ProjectPicker data={actions} /><button className="is-primary" type="button" disabled={busy !== null} onClick={() => void run("conversation", conversation, "")}><MessageSquare size={15} />{busy === "conversation" ? "正在准备…" : "基于此资料对话"}</button></> : null}<button type="button" aria-pressed={showProperties && !focusText} onClick={() => { if (window.innerWidth <= 700) detailsRef.current?.showModal(); else { setFocusText(false); setShowProperties(!showProperties); } }}>来源与处理</button><button type="button" onClick={() => detailsRef.current?.showModal()}>资料管理</button><div className="source-manage">{canManage ? <LibraryCardMenu sourceId={header.id} title={header.title} archived={actions.status === "ARCHIVED"} redirectOnDelete /> : null}</div></div>
      </div>{actions.status === "ARCHIVED" ? <p className="source-notice">此资料已归档，可在右上角菜单恢复。</p> : null}
    </header>
    <div className="source-workspace-layout"><div className="source-workspace-main"><div className="source-preview-slot" style={{ flexBasis: `min(${viewerHeight}px, 55%)` }}><SourceViewer key={header.id} model={model} mediaRef={mediaRef} onMediaReady={setCanSeek} onPreferredHeight={setViewerHeight} /></div>
      <nav className="source-content-tabs" aria-label="资料内容"><button type="button" aria-pressed={tab === "text"} onClick={() => setTab("text")}>{textLabel}</button><button type="button" aria-pressed={tab === "original"} onClick={() => setTab("original")}>原始信息</button><button className="source-reading-toggle" type="button" aria-pressed={focusText} onClick={() => { if (!focusText) mediaRef.current?.pause(); setFocusText(!focusText); }}>{focusText ? "显示预览与属性" : "专注阅读"}</button></nav>
      {tab === "text" ? <SourceText model={model} mediaRef={mediaRef} canSeek={canSeek && !focusText} /> : <section className="source-original"><h2>原始资料</h2><dl><dt>名称</dt><dd>{header.title}</dd><dt>格式</dt><dd>{workspace?.mimeType || header.typeLabel}</dd><dt>来源</dt><dd>{header.originalUrl ? <a href={header.originalUrl} target="_blank" rel="noreferrer">{header.originalUrl}</a> : "手动导入 / 本地上传"}</dd><dt>最近更新</dt><dd>{workspace?.updatedAt ? new Date(workspace.updatedAt).toLocaleString("zh-CN") : "暂无记录"}</dd></dl></section>}
    </div><aside className="source-workspace-rail" data-rail-tab={railTab} aria-label="资料属性与操作"><nav className="source-rail-tabs" aria-label="资料属性分类"><button type="button" aria-pressed={railTab === "info"} onClick={() => setRailTab("info")}>来源信息</button><button type="button" aria-pressed={railTab === "processing"} onClick={() => setRailTab("processing")}>处理与文件</button></nav>
      <section><header><h2>来源信息</h2>{workspace?.canRefresh ? <button type="button" disabled={busy !== null} onClick={() => void run("metadata", () => request(`/api/source-items/${header.id}/metadata/refresh`), "来源信息已更新。")}><RefreshCw size={13} />{busy === "metadata" ? "刷新中…" : "刷新信息"}</button> : null}</header><dl><dt>类型</dt><dd>{header.typeLabel}</dd><dt>来源</dt><dd>{header.platformLabel || header.sourceLabel}</dd>{header.author ? <><dt>作者</dt><dd>{header.author}</dd></> : null}{header.publishTime ? <><dt>发布时间</dt><dd>{new Date(header.publishTime).toLocaleDateString("zh-CN")}</dd></> : null}{header.durationLabel ? <><dt>时长</dt><dd>{header.durationLabel}</dd></> : null}{workspace?.sizeLabel ? <><dt>大小</dt><dd>{workspace.sizeLabel}</dd></> : null}{header.originalUrl ? <><dt>原始链接</dt><dd><a href={header.originalUrl} target="_blank" rel="noreferrer">打开来源 <ExternalLink size={12} /></a></dd></> : null}</dl>{workspace?.metrics && Object.values(workspace.metrics).some((value) => typeof value === "number") ? <div className="source-metrics">{([ ["views", "播放"], ["likes", "点赞"], ["comments", "评论"], ["favorites", "收藏"], ["shares", "转发"] ] as const).map(([key, label]) => workspace.metrics[key] !== null && workspace.metrics[key] !== undefined ? <span key={key}><strong>{workspace.metrics[key]!.toLocaleString()}</strong>{label}</span> : null)}</div> : null}</section>
      <section><header><h2>处理状态</h2></header><dl><dt>原始资料</dt><dd>{detail.preview.mediaUrl || transcript.text ? "已获取" : processing ? "获取中" : actions.status === "FAILED" ? "获取失败" : "尚未获取"}</dd><dt>{textLabel}</dt><dd>{stateLabel}</dd></dl>{canManage && actions.status !== "ARCHIVED" ? <div className="source-processing-actions">{media ? <button type="button" disabled={busy !== null || Boolean(processing) || !workspace?.configured || actions.status !== "READY"} onClick={() => void run("transcribe", () => request(`/api/source-items/${header.id}/transcribe`), "已提交转录任务。")}><RefreshCw size={14} />{processing ? "正在处理…" : transcript.text ? "重新转录" : transcript.state === "FAILED" ? "重试转录" : "开始转录"}</button> : null}{!processing && actions.failedJobId && (actions.status === "FAILED" || transcript.state === "FAILED") ? <button type="button" disabled={busy !== null} onClick={() => void run("retry", () => request(`/api/ingest-jobs/${actions.failedJobId}/retry`), "已提交重试任务。")}>重试读取原始资料</button> : null}{media && !workspace?.configured ? <small>转录服务尚未就绪，请检查服务设置。</small> : null}</div> : null}{notice ? <p className="source-notice" role="status">{notice}</p> : null}</section>
      <section><header><h2>文件操作</h2></header><div className="source-file-actions">{actions.downloadUrl ? <button type="button" disabled={busy !== null} onClick={() => void run("download", async () => { if (!workspace?.assetId) { window.open(actions.downloadUrl!, "_blank", "noopener,noreferrer"); return; } const response = await fetch(`/api/source-items/${header.id}/assets/${workspace.assetId}/access?disposition=attachment`); const result = await response.json(); if (!response.ok || !result.url) throw new Error(result.message || "无法获取下载链接"); const anchor = document.createElement("a"); anchor.href = result.url; anchor.download = header.title; anchor.click(); }, "已开始下载。")}><Download size={15} />{busy === "download" ? "正在准备…" : "下载原文件"}</button> : null}{header.originalUrl ? <><a href={header.originalUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />打开原始来源</a><button type="button" onClick={() => { void navigator.clipboard.writeText(header.originalUrl!).then(() => setNotice("原始链接已复制"), () => setNotice("复制失败，请手动复制链接。")); }}>复制原始链接</button></> : null}{!actions.downloadUrl && !header.originalUrl ? <small>可在文字区导出已有正文。</small> : null}</div></section>
    </aside></div>
    <dialog ref={detailsRef} className="source-details-dialog" aria-label="资料管理" onClick={(event) => { if (event.target === event.currentTarget) detailsRef.current?.close(); }}><header><h2>资料管理</h2><button type="button" onClick={() => detailsRef.current?.close()} aria-label="关闭资料管理">关闭</button></header><div className="source-details-body"><div className="source-mobile-properties">      <section><header><h2>来源信息</h2>{workspace?.canRefresh ? <button type="button" disabled={busy !== null} onClick={() => void run("metadata", () => request(`/api/source-items/${header.id}/metadata/refresh`), "来源信息已更新。")}><RefreshCw size={13} />{busy === "metadata" ? "刷新中…" : "刷新信息"}</button> : null}</header><dl><dt>类型</dt><dd>{header.typeLabel}</dd><dt>来源</dt><dd>{header.platformLabel || header.sourceLabel}</dd>{header.author ? <><dt>作者</dt><dd>{header.author}</dd></> : null}{header.publishTime ? <><dt>发布时间</dt><dd>{new Date(header.publishTime).toLocaleDateString("zh-CN")}</dd></> : null}{header.durationLabel ? <><dt>时长</dt><dd>{header.durationLabel}</dd></> : null}{workspace?.sizeLabel ? <><dt>大小</dt><dd>{workspace.sizeLabel}</dd></> : null}{header.originalUrl ? <><dt>原始链接</dt><dd><a href={header.originalUrl} target="_blank" rel="noreferrer">打开来源 <ExternalLink size={12} /></a></dd></> : null}</dl>{workspace?.metrics && Object.values(workspace.metrics).some((value) => typeof value === "number") ? <div className="source-metrics">{([ ["views", "播放"], ["likes", "点赞"], ["comments", "评论"], ["favorites", "收藏"], ["shares", "转发"] ] as const).map(([key, label]) => workspace.metrics[key] !== null && workspace.metrics[key] !== undefined ? <span key={key}><strong>{workspace.metrics[key]!.toLocaleString()}</strong>{label}</span> : null)}</div> : null}</section>
      <section><header><h2>处理状态</h2></header><dl><dt>原始资料</dt><dd>{detail.preview.mediaUrl || transcript.text ? "已获取" : processing ? "获取中" : actions.status === "FAILED" ? "获取失败" : "尚未获取"}</dd><dt>{textLabel}</dt><dd>{stateLabel}</dd></dl>{canManage && actions.status !== "ARCHIVED" ? <div className="source-processing-actions">{media ? <button type="button" disabled={busy !== null || Boolean(processing) || !workspace?.configured || actions.status !== "READY"} onClick={() => void run("transcribe", () => request(`/api/source-items/${header.id}/transcribe`), "已提交转录任务。")}><RefreshCw size={14} />{processing ? "正在处理…" : transcript.text ? "重新转录" : transcript.state === "FAILED" ? "重试转录" : "开始转录"}</button> : null}{!processing && actions.failedJobId && (actions.status === "FAILED" || transcript.state === "FAILED") ? <button type="button" disabled={busy !== null} onClick={() => void run("retry", () => request(`/api/ingest-jobs/${actions.failedJobId}/retry`), "已提交重试任务。")}>重试读取原始资料</button> : null}{media && !workspace?.configured ? <small>转录服务尚未就绪，请检查服务设置。</small> : null}</div> : null}{notice ? <p className="source-notice" role="status">{notice}</p> : null}</section>
      <section><header><h2>文件操作</h2></header><div className="source-file-actions">{actions.downloadUrl ? <button type="button" disabled={busy !== null} onClick={() => void run("download", async () => { if (!workspace?.assetId) { window.open(actions.downloadUrl!, "_blank", "noopener,noreferrer"); return; } const response = await fetch(`/api/source-items/${header.id}/assets/${workspace.assetId}/access?disposition=attachment`); const result = await response.json(); if (!response.ok || !result.url) throw new Error(result.message || "无法获取下载链接"); const anchor = document.createElement("a"); anchor.href = result.url; anchor.download = header.title; anchor.click(); }, "已开始下载。")}><Download size={15} />{busy === "download" ? "正在准备…" : "下载原文件"}</button> : null}{header.originalUrl ? <><a href={header.originalUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />打开原始来源</a><button type="button" onClick={() => { void navigator.clipboard.writeText(header.originalUrl!).then(() => setNotice("原始链接已复制"), () => setNotice("复制失败，请手动复制链接。")); }}>复制原始链接</button></> : null}{!actions.downloadUrl && !header.originalUrl ? <small>可在文字区导出已有正文。</small> : null}</div></section>
</div>      <section><header><h2>关联项目</h2><small>{actions.relatedProjects.length}</small></header><div className="source-project-links">{actions.relatedProjects.map((project) => <Link href={`/dashboard?project=${project.id}`} key={project.id}><FileText size={14} />{project.title}</Link>)}{!actions.relatedProjects.length ? <small>尚未加入项目，可通过上方入口添加。</small> : null}</div></section>
      <section><header><h2>标签与资料集</h2></header>{canManage ? <details className="source-organize"><summary>管理标签与资料集</summary><SourceActions {...actions} mode="CLASSIFICATION" /></details> : <div className="source-workspace-meta">{[...actions.tags, ...actions.collections].map((item) => <span key={item.id}>{item.name}</span>)}</div>}</section>
      {adminDetails ? <section><MaterialAdminDetails details={adminDetails} /></section> : null}
</div></dialog>
    {rename ? <NameDialog title="编辑资料标题" initialValue={header.title} onClose={() => setRename(false)} onInteractionLockChange={lock} onSave={async (title) => { await request(`/api/source-items/${header.id}`, "PATCH", { action: "UPDATE", title }); router.refresh(); }} /> : null}
  </div>;
}
