"use client";

import { Button } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

type NamedResource = { id: string; name: string };
type AvailableProject = { id: string; title: string };

export function SourceActions({
  sourceId,
  status,
  failedJobId,
  tags,
  availableTags,
  collections,
  availableCollections,
  availableProjects,
  canManageProjects,
}: {
  sourceId: string;
  status: string;
  failedJobId?: string;
  tags: NamedResource[];
  availableTags: NamedResource[];
  collections: NamedResource[];
  availableCollections: NamedResource[];
  availableProjects: AvailableProject[];
  canManageProjects: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(url: string, method: string, body?: unknown) {
    const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || "操作失败");
    return data;
  }

  async function action(work: () => Promise<void>) {
    setBusy(true); setError("");
    try { await work(); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败"); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">标签</h2>
        <div className="mt-3 flex flex-wrap gap-2">{tags.length ? tags.map((tag) => <span key={tag.id} className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-elevated)] px-3 py-1 text-sm">#{tag.name}<button disabled={busy} aria-label={`移除标签 ${tag.name}`} onClick={() => action(async () => { await call(`/api/source-items/${sourceId}/tags`, "DELETE", { tagId: tag.id }); })}>×</button></span>) : <span className="text-sm text-[var(--text-secondary)]">暂无标签</span>}</div>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" action={(formData) => action(async () => {
          const name = String(formData.get("tagName") || "");
          const tag = await call("/api/tags", "POST", { name });
          await call(`/api/source-items/${sourceId}/tags`, "POST", { tagId: tag.id });
        })}>
          <input name="tagName" aria-label="新标签" required list="existing-tags" className="h-10 min-w-0 flex-1 rounded-[var(--radius)] border bg-transparent px-3" placeholder="输入人工标签" />
          <datalist id="existing-tags">{availableTags.map((tag) => <option key={tag.id} value={tag.name} />)}</datalist>
          <Button disabled={busy}>添加标签</Button>
        </form>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Collections</h2>
        <div className="mt-3 flex flex-wrap gap-2">{collections.length ? collections.map((collection) => <span key={collection.id} className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-elevated)] px-3 py-1 text-sm">{collection.name}<button disabled={busy} aria-label={`移出 Collection ${collection.name}`} onClick={() => action(async () => { await call(`/api/source-items/${sourceId}/collections`, "DELETE", { collectionId: collection.id }); })}>×</button></span>) : <span className="text-sm text-[var(--text-secondary)]">尚未加入 Collection</span>}</div>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" action={(formData) => action(async () => {
          const collectionId = String(formData.get("collectionId") || "");
          await call(`/api/source-items/${sourceId}/collections`, "POST", { collectionId });
        })}>
          <select name="collectionId" aria-label="选择 Collection" required defaultValue="" className="h-10 min-w-0 flex-1 rounded-[var(--radius)] border bg-transparent px-3"><option value="" disabled>选择已有 Collection</option>{availableCollections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select>
          <Button variant="secondary" disabled={busy || availableCollections.length === 0}>加入 Collection</Button>
        </form>
        <form className="mt-2 flex flex-col gap-2 sm:flex-row" action={(formData) => action(async () => {
          const name = String(formData.get("collectionName") || "");
          const collection = await call("/api/collections", "POST", { name });
          await call(`/api/source-items/${sourceId}/collections`, "POST", { collectionId: collection.id });
        })}>
          <input name="collectionName" aria-label="新 Collection" required className="h-10 min-w-0 flex-1 rounded-[var(--radius)] border bg-transparent px-3" placeholder="新建一级 Collection" />
          <Button disabled={busy}>新建并加入</Button>
        </form>
      </section>

      {canManageProjects ? (
        <section className="rounded-xl border p-4">
          <h2 className="font-semibold">内容项目</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">素材只建立引用关系，不会复制原始内容。</p>
          <form className="mt-4 grid gap-2" action={(formData) => action(async () => {
            const project = await call("/api/projects", "POST", { title: String(formData.get("projectTitle") || ""), sourceItemId: sourceId });
            router.push(`/projects/${project.id}/studio`);
          })}>
            <input name="projectTitle" aria-label="新项目名称" required maxLength={200} className="h-10 rounded-[var(--radius)] border bg-transparent px-3" placeholder="输入项目名称" />
            <Button disabled={busy}>用此素材新建项目</Button>
          </form>
          <form className="mt-3 grid gap-2" action={(formData) => action(async () => {
            const projectId = String(formData.get("projectId") || "");
            await call(`/api/projects/${projectId}/sources`, "POST", { sourceItemId: sourceId, role: "REFERENCE" });
            router.push(`/projects/${projectId}/studio`);
          })}>
            <select name="projectId" aria-label="选择内容项目" required defaultValue="" className="h-10 min-w-0 rounded-[var(--radius)] border bg-transparent px-3"><option value="" disabled>选择未关联的项目</option>{availableProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
            <Button variant="secondary" disabled={busy || availableProjects.length === 0}>加入已有项目</Button>
          </form>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2 rounded-xl border p-4">
        {status === "FAILED" && failedJobId ? <Button disabled={busy} onClick={() => action(async () => { await call(`/api/ingest-jobs/${failedJobId}/retry`, "POST"); })}>重试采集</Button> : null}
        {status !== "ARCHIVED" ? <Button variant="secondary" disabled={busy} onClick={() => action(async () => { await call(`/api/source-items/${sourceId}`, "PATCH"); })}>归档</Button> : null}
        <Button variant="secondary" disabled={busy} className="text-[var(--danger)]" onClick={() => { if (window.confirm("确定永久删除这条素材、媒体文件、任务、标签和 Collection 关系吗？")) action(async () => { await call(`/api/source-items/${sourceId}`, "DELETE"); router.push("/library"); }); }}>删除</Button>
      </section>
      {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
