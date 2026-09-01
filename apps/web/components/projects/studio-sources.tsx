"use client";

import { Badge, Button } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectSource = {
  role: string;
  sourceItem: {
    id: string;
    title: string | null;
    sourcePlatform: string;
    sourceType: string;
    rawText: string | null;
    transcript: { fullText: string } | null;
  };
};

type AvailableSource = { id: string; title: string | null; sourcePlatform: string; sourceType: string };

async function request(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || "操作失败");
  return result;
}

export function StudioSources({ projectId, sources, availableSources, editable }: { projectId: string; sources: ProjectSource[]; availableSources: AvailableSource[]; editable: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function action(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await work(); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败"); }
    finally { setBusy(false); }
  }

  return (
    <section>
      <div className="flex items-center justify-between"><h2 className="font-semibold">Sources</h2><Badge>{sources.length}</Badge></div>
      <div className="mt-3 grid gap-2">
        {sources.map(({ role, sourceItem }) => (
          <details key={sourceItem.id} className="rounded-xl border bg-[var(--surface)] p-3">
            <summary className="cursor-pointer list-none">
              <p className="line-clamp-2 text-sm font-medium">{sourceItem.title || "未命名素材"}</p>
              <div className="mt-2 flex flex-wrap gap-1"><Badge>{sourceItem.sourcePlatform}</Badge><Badge>{sourceItem.sourceType}</Badge><Badge>{sourceItem.transcript ? "已转写" : "无转写"}</Badge></div>
            </summary>
            <p className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap border-t pt-3 text-xs leading-6 text-[var(--text-secondary)]">{sourceItem.transcript?.fullText || sourceItem.rawText || "暂无可用正文"}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]"><span>{role}</span>{editable ? <button disabled={busy} className="text-[var(--danger)]" onClick={() => action(() => request(`/api/projects/${projectId}/sources/${sourceItem.id}`, "DELETE"))}>移出项目</button> : null}</div>
          </details>
        ))}
        {sources.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-[var(--text-secondary)]">尚未添加素材。</p> : null}
      </div>
      {editable ? (
        <form className="mt-4 grid gap-2" action={(formData) => action(async () => {
          await request(`/api/projects/${projectId}/sources`, "POST", { sourceItemId: String(formData.get("sourceItemId") || ""), role: String(formData.get("role") || "REFERENCE") });
        })}>
          <select name="sourceItemId" aria-label="添加素材" required defaultValue="" className="h-10 min-w-0 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm"><option value="" disabled>选择素材</option>{availableSources.map((source) => <option key={source.id} value={source.id}>{source.title || "未命名素材"} · {source.sourcePlatform}</option>)}</select>
          <select name="role" aria-label="素材角色" defaultValue="REFERENCE" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm"><option value="REFERENCE">参考</option><option value="EVIDENCE">证据</option><option value="INSPIRATION">灵感</option><option value="OWN_MATERIAL">自有素材</option></select>
          <Button variant="secondary" disabled={busy || availableSources.length === 0}>添加素材</Button>
        </form>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-xs text-[var(--danger)]">{error}</p> : null}
    </section>
  );
}
