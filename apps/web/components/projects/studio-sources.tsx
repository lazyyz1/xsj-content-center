"use client";

import { Badge, Button } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sourcePlatformLabels, sourceTypeLabels } from "@/lib/content-labels";

type ProjectSource = {
  role: string;
  sourceItem: {
    id: string;
    title: string | null;
    sourcePlatform: string;
    sourceType: string;
    rawText: string | null;
    transcript: { fullText: string } | null;
    materialAnalysis: { version: number; suggestedTitle: string | null; summary: string | null; topic: string | null; targetAudience: string | null; coreViewpoint: string | null; keyPoints: string[]; coreQuestion: string | null } | null;
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
      <div className="flex items-center justify-between"><h2 className="font-semibold">项目素材</h2><Badge>{sources.length}</Badge></div>
      <div className="mt-3 grid gap-2">
        {sources.map(({ role, sourceItem }) => (
          <details key={sourceItem.id} className="rounded-xl border bg-[var(--surface)] p-3">
            <summary className="cursor-pointer list-none">
              <p className="line-clamp-2 text-sm font-medium">{sourceItem.title || "未命名素材"}</p>
              <div className="mt-2 flex flex-wrap gap-1"><Badge>{sourcePlatformLabels[sourceItem.sourcePlatform] || sourceItem.sourcePlatform}</Badge><Badge>{sourceTypeLabels[sourceItem.sourceType] || sourceItem.sourceType}</Badge><Badge>{sourceItem.transcript ? "已转写" : "原始正文"}</Badge>{sourceItem.materialAnalysis ? <Badge>已智能整理</Badge> : null}</div>
            </summary>
            {sourceItem.materialAnalysis ? <div className="mt-3 rounded-lg bg-[var(--surface-elevated)] p-3 text-xs leading-5"><div className="flex items-center justify-between gap-2"><strong>智能整理 v{sourceItem.materialAnalysis.version}</strong><Badge>已智能整理</Badge></div><p className="mt-2"><span className="text-[var(--text-secondary)]">主题：</span>{sourceItem.materialAnalysis.topic}</p><p className="mt-1"><span className="text-[var(--text-secondary)]">素材核心观点：</span>{sourceItem.materialAnalysis.coreViewpoint}</p><div className="mt-3 border-t pt-3"><p><span className="text-[var(--text-secondary)]">参考标题：</span>{sourceItem.materialAnalysis.suggestedTitle || "未提供"}</p><p className="mt-1"><span className="text-[var(--text-secondary)]">目标受众：</span>{sourceItem.materialAnalysis.targetAudience || "未提供"}</p><p className="mt-1"><span className="text-[var(--text-secondary)]">核心问题：</span>{sourceItem.materialAnalysis.coreQuestion || "未提供"}</p><p className="mt-1"><span className="text-[var(--text-secondary)]">参考内容摘要：</span>{sourceItem.materialAnalysis.summary || "未提供"}</p>{sourceItem.materialAnalysis.keyPoints.length ? <ul className="mt-2 list-disc pl-4">{sourceItem.materialAnalysis.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul> : null}</div></div> : null}
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
          <select name="sourceItemId" aria-label="添加素材" required defaultValue="" className="h-10 min-w-0 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm"><option value="" disabled>选择素材</option>{availableSources.map((source) => <option key={source.id} value={source.id}>{source.title || "未命名素材"} · {sourcePlatformLabels[source.sourcePlatform] || source.sourcePlatform}</option>)}</select>
          <select name="role" aria-label="素材角色" defaultValue="REFERENCE" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm"><option value="REFERENCE">参考</option><option value="EVIDENCE">证据</option><option value="INSPIRATION">灵感</option><option value="OWN_MATERIAL">自有素材</option></select>
          <Button variant="secondary" disabled={busy || availableSources.length === 0}>添加素材</Button>
        </form>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-xs text-[var(--danger)]">{error}</p> : null}
    </section>
  );
}
