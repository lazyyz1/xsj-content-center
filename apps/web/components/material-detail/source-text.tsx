"use client";
import { Copy, Download, PencilLine, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type RefObject } from "react";
import type { SourceWorkspaceModel } from "@/server/material-detail/read-model";

function timestamp(ms: number, srt = false) { const total = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor(total / 60) % 60).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}${srt ? `,${String(Math.floor(ms % 1000)).padStart(3, "0")}` : ""}`; }
export function SourceText({ model, mediaRef, canSeek = false }: { model: SourceWorkspaceModel; mediaRef: RefObject<HTMLMediaElement | null>; canSeek?: boolean }) {
  const { detail, workspace, actions } = model;
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const text = detail.transcript.text || "";
  const segments = detail.transcript.segments;
  const matches = segments.filter((segment) => segment.text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const paragraphs = text.split(/\n+/).filter((paragraph) => paragraph.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const validSrt = segments.length > 0 && segments.every((segment) => segment.startMs !== null && segment.endMs !== null && segment.endMs > segment.startMs);
  async function save() {
    setBusy(true); setNotice("");
    try { const response = await fetch(`/api/source-items/${actions.sourceId}/transcript`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullText: draft, expectedUpdatedAt: workspace?.transcriptUpdatedAt || workspace?.updatedAt }) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "保存失败"); setEditing(false); setNotice("文字已保存。"); router.refresh(); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "保存失败，请重试。"); }
    finally { setBusy(false); }
  }
  function download(srt = false) {
    const body = srt ? segments.map((segment, index) => `${index + 1}\n${timestamp(segment.startMs!, true)} --> ${timestamp(segment.endMs!, true)}\n${segment.text}`).join("\n\n") : text;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `${detail.header.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 100)}.${srt ? "srt" : "txt"}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="source-text" aria-label="资料文字内容"><div className="source-text-toolbar"><label><Search size={15} /><input aria-label="搜索文字内容" placeholder="搜索文字内容…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><div>{text ? <><button type="button" onClick={() => { void navigator.clipboard.writeText(text).then(() => setNotice("全文已复制"), () => setNotice("复制失败，请手动选择文字。")); }}><Copy size={14} />复制</button><button type="button" onClick={() => download()}><Download size={14} />TXT</button>{validSrt ? <button type="button" onClick={() => download(true)}>SRT</button> : null}</> : null}{actions.canManageProjects && actions.status !== "ARCHIVED" && !workspace?.busy && !editing ? <button type="button" onClick={() => { setDraft(text); setEditing(true); }}><PencilLine size={14} />{text ? "编辑" : "补充文字"}</button> : null}</div></div>
    {editing ? <div className="source-text-editor"><textarea aria-label="编辑资料文字" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000000} /><p>编辑全文后，旧的时间戳片段将移除，避免与新正文不一致。</p><div><button type="button" disabled={busy || !draft.trim()} onClick={() => void save()}>{busy ? "正在保存…" : "保存文字"}</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>取消</button></div></div> : text ? <div className="source-text-content">{search ? <small>{segments.length ? matches.length : paragraphs.length} 处匹配段落</small> : <small>{text.length.toLocaleString()} 字</small>}{segments.length ? matches.map((segment, index) => <article className="source-transcript-line" key={`${segment.startMs}-${index}`}><button type="button" disabled={segment.startMs === null || !canSeek} aria-label={`跳转到 ${timestamp(segment.startMs || 0)}`} onClick={() => { if (mediaRef.current && segment.startMs !== null) { mediaRef.current.currentTime = segment.startMs / 1000; mediaRef.current.scrollIntoView({ block: "center", behavior: "auto" }); } }}>{segment.startMs === null ? "—" : timestamp(segment.startMs)}</button><p>{segment.text}</p></article>) : paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : <div className="source-workspace-empty"><p>{workspace?.busy ? "正在读取资料，文字准备好后会自动显示。" : "还没有文字内容。可使用右侧的处理操作，或手动补充文字。"}</p></div>}
    {notice ? <p role="status" className="source-notice">{notice}</p> : null}
  </section>;
}
