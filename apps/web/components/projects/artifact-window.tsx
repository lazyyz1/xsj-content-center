"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ArtifactSummaryView, ArtifactView } from "@/server/artifacts/view-model";
import "./artifact-window.css";
export function ArtifactWindow({ projectId, artifacts, active, onClose, onContinue }: { projectId: string; artifacts: ArtifactSummaryView[]; active: ArtifactView | null; onClose: () => void; onContinue: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) dialog.current?.showModal(); }, [mounted]);
  if (!mounted) return null;
  return createPortal(<dialog ref={dialog} className="artifact-window" aria-label="项目成果" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="artifact-window-layout"><aside><h2>项目成果</h2><nav aria-label="成果列表">{artifacts.map(item => <Link key={item.artifactId} href={`/dashboard?project=${projectId}&node=artifact:${item.artifactId}`} scroll={false} aria-current={active?.artifactId === item.artifactId ? "page" : undefined}><FileText size={15}/><span>{item.title}<small>V{item.version}</small></span></Link>)}</nav><p>保留在当前项目中</p></aside>
    <section className="artifact-window-content"><header><div><h2>{active?.title || "选择一份成果"}</h2>{active ? <small>文本成果 · V{active.version}</small> : null}</div><button type="button" aria-label="关闭成果" onClick={onClose}><X size={19}/></button></header>
    <article className="artifact-window-body assistant-markdown" data-testid="generic-artifact-view">{active ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({alt}) => <span>{alt || "图片引用"}</span> }}>{active.content}</ReactMarkdown> : <p>从左侧选择已保存的成果。</p>}</article>
    {active ? <footer><span>修改后保存会生成新版本，旧版本保留。</span><button type="button" onClick={onContinue}>继续修改</button></footer> : null}</section></div>
  </dialog>, document.body);
}
