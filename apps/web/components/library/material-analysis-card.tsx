"use client";

import { Badge, Button, Card } from "@content-center/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { MaterialAnalysisDTO } from "@/server/material-analysis/service";

type Editable = {
  suggestedTitle: string;
  summary: string;
  topic: string;
  tags: string;
  keywords: string;
  contentType: string;
  targetAudience: string;
  coreViewpoint: string;
  keyPoints: string;
  coreQuestion: string;
};

function editableFrom(value: MaterialAnalysisDTO): Editable {
  return {
    suggestedTitle: value.suggestedTitle ?? "",
    summary: value.summary ?? "",
    topic: value.topic ?? "",
    tags: value.tags.join("，"),
    keywords: value.keywords.join("，"),
    contentType: value.contentType ?? "",
    targetAudience: value.targetAudience ?? "",
    coreViewpoint: value.coreViewpoint ?? "",
    keyPoints: value.keyPoints.join("\n"),
    coreQuestion: value.coreQuestion ?? "",
  };
}

function list(text: string) {
  return [...new Set(text.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean))];
}

async function request(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "操作失败，请重试。");
  return result;
}

export function MaterialAnalysisCard({ sourceId, current: initial, canEdit, llmStatus, canConfigure, hasTranscript, embedded = false, showCreateAction = true }: {
  sourceId: string;
  current: MaterialAnalysisDTO | null;
  canEdit: boolean;
  llmStatus: string;
  canConfigure: boolean;
  hasTranscript: boolean;
  embedded?: boolean;
  showCreateAction?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<Editable | null>(() => initial?.status === "COMPLETED" ? editableFrom(initial) : null);
  const configured = llmStatus === "CONFIGURED";
  const statusLabel = analyzing || current?.status === "PROCESSING" ? "整理中" : current?.status === "FAILED" ? "整理失败" : current?.status === "COMPLETED" ? "已智能整理" : "尚未整理";
  const inputClass = "mt-1 w-full rounded-[var(--radius)] border bg-[var(--surface)] px-3 py-2 text-sm";
  const fields = useMemo(() => form ? [
    ["suggestedTitle", "建议标题", false], ["summary", "简短摘要", true], ["topic", "主题", false], ["tags", "标签（逗号分隔，最多 8 个）", false],
    ["keywords", "关键词（逗号分隔，最多 10 个）", false], ["contentType", "内容类型", false], ["targetAudience", "目标人群", true],
    ["coreViewpoint", "核心观点", true], ["keyPoints", "关键要点（每行一项，最多 6 项）", true], ["coreQuestion", "核心问题", true],
  ] as const : [], [form]);
  const Container = embedded ? "section" : Card;

  async function analyze() {
    if (current && !confirming) { setConfirming(true); return; }
    setBusy(true); setAnalyzing(true); setError(""); setNotice("");
    try {
      const result = await request(`/api/source-items/${sourceId}/material-analysis`, "POST") as MaterialAnalysisDTO;
      setCurrent(result); setForm(editableFrom(result)); setConfirming(false); setNotice("智能整理已完成。"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "智能整理失败，请重试。"); }
    finally { setBusy(false); setAnalyzing(false); }
  }

  async function save() {
    if (!current || !form) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request(`/api/source-items/${sourceId}/material-analysis/${current.id}`, "PUT", { ...form, tags: list(form.tags), keywords: list(form.keywords), keyPoints: list(form.keyPoints) }) as MaterialAnalysisDTO;
      setCurrent(result); setForm(editableFrom(result)); setEditing(false); setNotice("整理结果已保存，标签已同步到素材。"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败。"); }
    finally { setBusy(false); }
  }

  async function createContent() {
    setBusy(true); setError("");
    try {
      const result = await request(`/api/source-items/${sourceId}/material-analysis/project`, "POST") as { projectId: string };
      router.push(`/projects/${result.projectId}/studio`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法进入创作工作台。"); setBusy(false); }
  }

  return (
    <Container className={embedded ? "" : "p-5"} data-testid="material-analysis-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-semibold">智能整理</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">理解素材的主题、观点与可用信息；不会自动生成稿件。</p></div>
        <div className="flex gap-2"><Badge>{statusLabel}</Badge>{current?.stale ? <Badge className="border-[var(--warning)] text-[var(--warning)]">转写已更新</Badge> : null}{llmStatus === "MOCK" ? <Badge className="border-[var(--warning)] text-[var(--warning)]">MOCK MODE</Badge> : null}</div>
      </div>

      {!hasTranscript && !current ? <p className="mt-4 text-sm text-[var(--text-secondary)]">请先完成语音转写，再进行智能整理。</p> : null}
      {hasTranscript && !configured && !current ? <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-[var(--text-secondary)]">Kimi 2.6 尚未配置。{canConfigure ? <Link href="/settings/integrations" className="ml-2 font-medium text-[var(--accent)]">前往 AI 与外部服务设置</Link> : "请联系管理员完成配置。"}</div> : null}
      {hasTranscript && !current && configured ? <p className="mt-4 text-sm text-[var(--text-secondary)]">转写已完成，可按需让 Kimi 2.6 整理这条素材。</p> : null}
      {current?.status === "PROCESSING" ? <p className="mt-4 text-sm text-[var(--text-secondary)]">正在整理，请勿重复提交。</p> : null}
      {current?.status === "FAILED" ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{current.errorMessage || "整理失败，请重试。"}</p> : null}

      {current?.status === "COMPLETED" && !editing ? <div className="mt-5 grid gap-4">
        <div><p className="text-xs text-[var(--text-secondary)]">建议标题</p><p className="mt-1 font-medium">{current.suggestedTitle}</p></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-[var(--text-secondary)]">主题</p><p className="mt-1 text-sm">{current.topic}</p></div><div><p className="text-xs text-[var(--text-secondary)]">内容类型</p><p className="mt-1 text-sm">{current.contentType}</p></div></div>
        <div><p className="text-xs text-[var(--text-secondary)]">简短摘要</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{current.summary}</p></div>
        <div><p className="text-xs text-[var(--text-secondary)]">核心观点</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{current.coreViewpoint}</p></div>
        <div className="flex flex-wrap gap-2">{current.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>
        <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">查看完整整理结果</summary><div className="mt-4 grid gap-4 text-sm"><div><span className="text-[var(--text-secondary)]">目标人群：</span>{current.targetAudience}</div><div><span className="text-[var(--text-secondary)]">核心问题：</span>{current.coreQuestion}</div><div><p className="text-[var(--text-secondary)]">关键要点</p><ul className="mt-2 list-disc space-y-1 pl-5">{current.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></div><div><span className="text-[var(--text-secondary)]">关键词：</span>{current.keywords.join("、")}</div></div></details>
      </div> : null}

      {editing && form ? <div className="mt-5 grid gap-4">{fields.map(([key, label, multiline]) => <label key={key} className="text-sm">{label}{multiline ? <textarea rows={key === "keyPoints" ? 5 : 3} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={inputClass} /> : <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={inputClass} />}</label>)}</div> : null}

      {confirming ? <div className="mt-4 rounded-xl border border-[var(--warning)] p-4 text-sm"><p>重新整理会生成新的 AI 版本，当前版本不会删除。人工修改过的结果也会保留。</p><div className="mt-3 flex gap-2"><Button disabled={busy} onClick={analyze}>确认重新整理</Button><Button variant="secondary" onClick={() => setConfirming(false)}>取消</Button></div></div> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{notice}</p> : null}
      {canEdit ? <div className="mt-5 flex flex-wrap gap-2">
        {editing ? <><Button disabled={busy} onClick={save}>保存修改</Button><Button variant="secondary" disabled={busy} onClick={() => { setEditing(false); if (current) setForm(editableFrom(current)); }}>取消</Button></> : <>
          {current?.status === "COMPLETED" ? <Button variant="secondary" disabled={busy} onClick={() => setEditing(true)}>编辑整理</Button> : null}
          {hasTranscript && configured && current?.status !== "PROCESSING" ? <Button variant="secondary" disabled={busy || confirming} onClick={analyze}>{analyzing ? "处理中…" : current ? "重新整理" : "开始智能整理"}</Button> : null}
          {showCreateAction && current?.status === "COMPLETED" ? <Button disabled={busy} onClick={createContent}>基于这条素材创作</Button> : null}
        </>}
      </div> : null}
    </Container>
  );
}
