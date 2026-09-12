"use client";

import { Archive, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type ProjectAction = "rename" | "archive" | "delete";

export function ProjectCardMenu({ projectId, title, ended }: { projectId: string; title: string; ended: boolean }) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [busy, setBusy] = useState<ProjectAction | null>(null);
  const [error, setError] = useState("");

  async function finish(action: ProjectAction, request: Promise<Response>) {
    setBusy(action);
    setError("");
    try {
      const response = await request;
      if (!response.ok) throw new Error();
      detailsRef.current?.removeAttribute("open");
      router.refresh();
    } catch {
      setError(action === "rename" ? "重命名失败，请稍后再试。" : action === "archive" ? "归档失败，请稍后再试。" : "删除失败，请稍后再试。");
    } finally {
      setBusy(null);
    }
  }

  function rename() {
    const nextTitle = window.prompt("输入新的项目名称", title)?.trim();
    if (!nextTitle || nextTitle === title) return;
    void finish("rename", fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: nextTitle }),
    }));
  }

  function archive() {
    if (!window.confirm("归档后项目将从项目页隐藏，确定继续吗？")) return;
    void finish("archive", fetch(`/api/projects/${projectId}/transition`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "ARCHIVED" }),
    }));
  }

  function remove() {
    if (!window.confirm(`确定删除“${title}”吗？此操作无法撤销。`)) return;
    void finish("delete", fetch(`/api/projects/${projectId}`, { method: "DELETE" }));
  }

  return <details ref={detailsRef} className="project-card-menu" onClick={(event) => event.stopPropagation()}>
    <summary aria-label={`更多项目操作：${title}`}><MoreHorizontal size={18} /></summary>
    <div aria-busy={busy !== null}>
      <button type="button" disabled={busy !== null} onClick={rename}><PencilLine size={15} />重命名</button>
      {ended ? <button type="button" disabled={busy !== null} onClick={archive}><Archive size={15} />归档</button> : null}
      <button type="button" className="is-danger" disabled={busy !== null} onClick={remove}><Trash2 size={15} />删除</button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  </details>;
}
