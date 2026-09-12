"use client";

import { Archive, ArrowRight, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function LibraryCardAction({ sourceId, href, mode }: { sourceId: string; href: string; mode: "CREATE" | "RESEARCH" | "DETAIL" | "PROGRESS" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = mode === "RESEARCH" ? "进入研究" : mode === "PROGRESS" ? "查看进度" : mode === "DETAIL" ? "查看详情" : "用于创作";

  if (mode !== "CREATE") return <Link className="project-card-primary" href={href}>{label}<ArrowRight size={15} /></Link>;

  async function create() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/source-items/${sourceId}/material-analysis/project`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.projectId !== "string") throw new Error(result.message || result.error || "暂时无法进入创作。");
      router.push(`/dashboard?project=${result.projectId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "暂时无法进入创作。");
      setBusy(false);
    }
  }

  return <div className="library-card-action">
    <button className="project-card-primary" type="button" disabled={busy} onClick={() => void create()}>{busy ? "正在进入…" : label}<ArrowRight size={15} /></button>
    {error ? <span role="alert">{error}</span> : null}
  </div>;
}

export function LibraryCardMenu({ sourceId, title, archived }: { sourceId: string; title: string; archived: boolean }) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [busy, setBusy] = useState<"archive" | "delete" | null>(null);
  const [error, setError] = useState("");

  async function finish(action: "archive" | "delete", request: Promise<Response>) {
    setBusy(action);
    setError("");
    try {
      const response = await request;
      const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "操作失败，请稍后再试。");
      detailsRef.current?.removeAttribute("open");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请稍后再试。");
    } finally {
      setBusy(null);
    }
  }

  function archive() {
    if (!window.confirm("归档后资料将从默认列表隐藏，确定继续吗？")) return;
    void finish("archive", fetch(`/api/source-items/${sourceId}`, { method: "PATCH" }));
  }

  function remove() {
    if (!window.confirm(`确定删除“${title}”吗？已被研究结果或项目引用的资料可能无法删除。`)) return;
    void finish("delete", fetch(`/api/source-items/${sourceId}`, { method: "DELETE" }));
  }

  return <details ref={detailsRef} className="project-card-menu library-card-menu" onClick={(event) => event.stopPropagation()}>
    <summary aria-label={`更多资料操作：${title}`}><MoreHorizontal size={18} /></summary>
    <div aria-busy={busy !== null}>
      {!archived ? <button type="button" disabled={busy !== null} onClick={archive}><Archive size={15} />归档</button> : null}
      <button type="button" className="is-danger" disabled={busy !== null} onClick={remove}><Trash2 size={15} />删除</button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  </details>;
}
