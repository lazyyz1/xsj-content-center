"use client";

import { AudioLines, Expand, FileText, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { SourceWorkspaceModel } from "@/server/material-detail/read-model";

export function SourceViewer({ model, mediaRef, onMediaReady }: {
  model: SourceWorkspaceModel;
  mediaRef: RefObject<HTMLMediaElement | null>;
  onMediaReady?: (ready: boolean) => void;
}) {
  const { preview, header } = model.detail;
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const imageViewportRef = useRef<HTMLDivElement>(null);
  const pdf = model.workspace.mimeType === "application/pdf";
  const url = preview.type === "DOCUMENT" ? preview.documentUrl : preview.mediaUrl || (preview.type === "IMAGE" ? preview.coverUrl : null);

  useEffect(() => {
    const element = imageViewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [url, failed]);

  const fittedScale = natural.width && natural.height && viewport.width && viewport.height
    ? Math.min(viewport.width / natural.width, viewport.height / natural.height, 1) : 1;
  const scale = (fit ? fittedScale : 1) * zoom;
  const imageWidth = natural.width * scale;
  const imageHeight = natural.height * scale;
  const unavailable = failed || !url;
  function resetFit() { setFit(true); setZoom(1); }

  if (preview.type === "AUDIO" && url && !failed) return <section className="source-audio-player" aria-label="原始资料预览">
    <span className="source-audio-icon"><AudioLines size={23} /></span>
    <div><strong>原始音频</strong><audio ref={(element) => { mediaRef.current = element; }} controls preload="metadata" src={url}
      onLoadedMetadata={() => onMediaReady?.(true)} onError={() => { setFailed(true); onMediaReady?.(false); }} /></div>
  </section>;

  return <section className="source-viewer" aria-label="原始资料预览">
    <header className="source-viewer-tools">
      <div className="source-viewer-heading"><FileText size={15} /><strong>原件</strong><span>{model.workspace.sizeLabel || header.typeLabel}</span></div>
      <div className="source-viewer-controls">
        {preview.type === "IMAGE" && !unavailable ? <>
          <button type="button" onClick={resetFit} aria-pressed={fit && zoom === 1} title="完整显示图片"><Expand size={14} /><span>适应窗口</span></button>
          <button type="button" onClick={() => { setFit(false); setZoom(1); }} aria-pressed={!fit && zoom === 1}>原始尺寸</button>
        </> : null}
        <button type="button" aria-label="全屏预览" title="全屏预览" onClick={() => {
          void frameRef.current?.requestFullscreen().catch(() => setNotice("当前浏览器不支持全屏，可下载原件查看。"));
        }}><Maximize2 size={15} /></button>
      </div>
    </header>
    <div ref={frameRef} className={`source-viewer-stage type-${preview.type.toLowerCase()}`}>
      {unavailable ? <div className="source-viewer-fallback"><FileText size={30} /><strong>{failed ? "预览暂时无法加载" : "暂无可用预览"}</strong>
        <p>{preview.unavailableReason || "你仍可以下载原文件，或打开原始来源查看。"}</p>{url ? <a href={url} target="_blank" rel="noreferrer">打开原文件</a> : null}</div>
        : preview.type === "IMAGE" ? <div ref={imageViewportRef} className="source-image-scroll">
          <div className="source-image-canvas" style={{ width: Math.max(imageWidth, viewport.width), height: Math.max(imageHeight, viewport.height) }}>
            <img src={url} alt={header.title} draggable={false} style={natural.width ? { width: imageWidth, height: imageHeight } : { maxWidth: "100%", maxHeight: "100%" }}
              onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setFailed(true)} />
          </div>
        </div>
        : preview.type === "VIDEO" ? <video ref={(element) => { mediaRef.current = element; }} src={url} poster={preview.coverUrl || undefined} controls preload="metadata" playsInline
          onLoadedMetadata={() => onMediaReady?.(true)} onError={() => { setFailed(true); onMediaReady?.(false); }} />
        : preview.type === "DOCUMENT" && pdf ? <iframe title="PDF 原始文件" src={url} />
        : <div className="source-viewer-fallback"><FileText size={30} /><strong>{header.title}</strong><p>此格式暂不支持内嵌预览。</p><a href={url} target="_blank" rel="noreferrer">打开或下载原文件</a></div>}
    </div>
    <footer className="source-viewer-footer">
      <span>{preview.type === "IMAGE" ? "完整保留原图比例" : header.typeLabel + "原件"}</span>
      {preview.type === "IMAGE" && !unavailable ? <div className="source-zoom-controls">
        <button type="button" aria-label="缩小图片" disabled={zoom <= .5} onClick={() => setZoom(Math.max(.5, zoom - .25))}><ZoomOut size={15} /></button>
        <span aria-label="图片缩放比例">{Math.round(scale * 100)}%</span>
        <button type="button" aria-label="放大图片" disabled={zoom >= 4} onClick={() => setZoom(Math.min(4, zoom + .25))}><ZoomIn size={15} /></button>
      </div> : null}
      {preview.type === "VIDEO" && !unavailable ? <label>倍速 <select aria-label="播放速度" defaultValue="1" onChange={(event) => { if (mediaRef.current) mediaRef.current.playbackRate = Number(event.target.value); }}>{[.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label> : null}
      {notice ? <span role="status">{notice}</span> : null}
    </footer>
  </section>;
}
