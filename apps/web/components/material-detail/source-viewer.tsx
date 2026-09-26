"use client";
import { FileText, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { SourceWorkspaceModel } from "@/server/material-detail/read-model";

export function SourceViewer({ model, mediaRef, onMediaReady, onPreferredHeight }: { model: SourceWorkspaceModel; mediaRef: RefObject<HTMLMediaElement | null>; onMediaReady?: (ready: boolean) => void; onPreferredHeight?: (height: number) => void }) {
  const { preview, header } = model.detail;
  const [ratio, setRatio] = useState("auto");
  const [height, setHeight] = useState(480);
  const [fit, setFit] = useState<"contain" | "cover">("contain");
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const key = `source-viewer:v1:${header.id}`;
  useEffect(() => { onPreferredHeight?.(height); }, [height, onPreferredHeight]);
  useEffect(() => {
    setFailed(false);
    try { const saved = JSON.parse(localStorage.getItem(key) || "null") as { ratio?: string; height?: number; fit?: string } | null; setRatio(saved?.ratio && ["auto", "16/9", "9/16", "1/1"].includes(saved.ratio) ? saved.ratio : "auto"); setHeight(saved?.height ? Math.max(280, Math.min(800, saved.height)) : 480); setFit(saved?.fit === "cover" ? "cover" : "contain"); } catch { /* Use defaults when storage is unavailable. */ }
  }, [key]);
  function persist(next: { ratio: string; height: number; fit: string }) { try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Preview remains usable. */ } }
  const isMedia = preview.type === "VIDEO" || preview.type === "AUDIO";
  const pdf = model.workspace?.mimeType?.toLowerCase().includes("pdf");
  const url = preview.type === "DOCUMENT" ? preview.documentUrl : preview.mediaUrl || (preview.type === "IMAGE" ? preview.coverUrl : null);
  const unavailable = failed || (!url && preview.type !== "TEXT" && preview.type !== "URL");
  return <section className="source-viewer" aria-label="原始资料预览">
    <div className="source-viewer-tools"><strong>原始资料</strong><div>
      <select aria-label="预览比例" value={ratio} onChange={(event) => { setRatio(event.target.value); persist({ ratio: event.target.value, height, fit }); }}><option value="auto">自适应</option><option value="16/9">横屏 16:9</option><option value="9/16">竖屏 9:16</option><option value="1/1">方形 1:1</option></select>
      <select aria-label="画面适配" value={fit} onChange={(event) => { const value = event.target.value as "contain" | "cover"; setFit(value); persist({ ratio, height, fit: value }); }}><option value="contain">完整显示</option><option value="cover">填满画面</option></select>
      <label className="source-viewer-size">高度<input type="range" aria-label="预览高度" min={280} max={800} step={20} value={height} onChange={(event) => { const value = Number(event.target.value); setHeight(value); persist({ ratio, height: value, fit }); }} /></label>
      <button type="button" aria-label="全屏预览" onClick={() => { void frameRef.current?.requestFullscreen().catch(() => setNotice("当前浏览器不支持全屏，请使用浏览器全屏模式。")); }}><Maximize2 size={15} /></button>
    </div></div>
    <div ref={frameRef} className={`source-viewer-stage type-${preview.type.toLowerCase()}`} style={{ height }}>
      <div className="source-viewer-frame" style={{ width: ratio === "auto" ? "100%" : undefined, aspectRatio: ratio === "auto" ? undefined : ratio, height: "100%", maxWidth: "100%" }}>
        {unavailable ? <div className="source-viewer-fallback"><FileText size={32} /><strong>{failed ? "预览暂时无法加载" : "暂无可用预览"}</strong><p>{preview.unavailableReason || "可以下载原文件，或打开原始来源查看。"}</p>{url ? <a href={url} target="_blank" rel="noreferrer">在新标签页打开原文件</a> : null}</div> : preview.type === "VIDEO" ? <video ref={(element) => { mediaRef.current = element; }} src={url!} poster={preview.coverUrl || undefined} controls preload="metadata" playsInline style={{ objectFit: fit }} onLoadedMetadata={() => onMediaReady?.(true)} onError={() => { setFailed(true); onMediaReady?.(false); }} /> : preview.type === "AUDIO" ? <div className="source-audio"><FileText size={36} /><h2>{header.title}</h2><audio ref={(element) => { mediaRef.current = element; }} controls preload="metadata" src={url!} onLoadedMetadata={() => onMediaReady?.(true)} onError={() => { setFailed(true); onMediaReady?.(false); }} /></div> : preview.type === "IMAGE" ? <div className="source-image-scroll"><img src={url!} alt={header.title} style={{ objectFit: fit, transform: `scale(${zoom})`, transformOrigin: "center" }} onError={() => setFailed(true)} /></div> : preview.type === "DOCUMENT" ? pdf ? <iframe title="PDF 原始文件" src={url!} /> : <div className="source-viewer-fallback"><FileText size={36} /><strong>{header.title}</strong><p>此格式暂不支持内嵌预览。</p><a href={url!} target="_blank" rel="noreferrer">打开或下载原文件</a></div> : <article className="source-text-preview">{model.detail.transcript.text || preview.rawTextPreview || "尚未读取到正文，可打开原始来源查看。"}</article>}
      </div>
    </div>
    <footer>{isMedia && url && !failed ? <label>播放速度<select aria-label="播放速度" defaultValue="1" onChange={(event) => { if (mediaRef.current) mediaRef.current.playbackRate = Number(event.target.value); }}>{[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label> : <span>{header.typeLabel} · {model.workspace?.sizeLabel || "原始内容"}</span>}{preview.type === "IMAGE" && url ? <div><button type="button" aria-label="缩小图片" onClick={() => setZoom(Math.max(.5, zoom - .25))}><ZoomOut size={15} /></button><span>{Math.round(zoom * 100)}%</span><button type="button" aria-label="放大图片" onClick={() => setZoom(Math.min(3, zoom + .25))}><ZoomIn size={15} /></button><button type="button" onClick={() => setZoom(1)}>重置</button></div> : null}<span role="status">{notice}</span></footer>
  </section>;
}
