"use client";

import { Button } from "@content-center/ui";
import { FileUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type WorkflowSkillPreview = {
  name: string;
  outputType: string;
  scenarios: string[];
  preconditions: string[];
  steps: string[];
  judgementRules: string[];
  expressionRules: string[];
  prohibitions: string[];
  outputRequirements: string[];
  factBoundary: string[];
  sourceType: string;
  sourceNote: string;
  hasExamples: boolean;
};

function List({ items }: { items: string[] }) {
  return <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export function WorkflowSkillImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [preview, setPreview] = useState<WorkflowSkillPreview | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function request(save: boolean) {
    setBusy(true);
    setIssues([]);
    setNotice("");
    try {
      const response = await fetch("/api/methods/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ markdown, save }) });
      const body = await response.json().catch(() => ({})) as { preview?: WorkflowSkillPreview; issues?: string[]; message?: string };
      if (!response.ok) {
        setPreview(null);
        setIssues(body.issues?.length ? body.issues : [body.message || "这个创作方法还不能导入。"]);
        return;
      }
      if (save) {
        setNotice("创作方法已保存，可以在创作中选择。");
        setOpen(false);
        setMarkdown("");
        setPreview(null);
        router.refresh();
      } else {
        setPreview(body.preview ?? null);
      }
    } catch {
      setIssues(["暂时无法读取这份 Markdown，请稍后再试。"]);
    } finally {
      setBusy(false);
    }
  }

  return <section data-testid="workflow-skill-import" className="method-import-panel">
    <div className="method-browser-actions">
      <Button variant="secondary" onClick={() => { setOpen((current) => !current); setIssues([]); setNotice(""); }}>{open ? <X size={16} /> : <FileUp size={16} />} {open ? "关闭导入" : "导入创作方法"}</Button>
    </div>
    {notice ? <p role="status" className="mt-2 text-sm text-[var(--success)]">{notice}</p> : null}
    {open ? <div className="mt-4 rounded-2xl border bg-[var(--surface)] p-5">
      <header><h2 className="font-semibold">导入创作方法</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">粘贴遵循 Workflow Skill Contract v1 的 Markdown，先预览，再保存。</p></header>
      <label className="mt-4 grid gap-2 text-sm"><span>Markdown 内容</span><textarea aria-label="Workflow Skill Markdown" value={markdown} onChange={(event) => setMarkdown(event.target.value)} className="min-h-64 rounded-xl border bg-transparent p-3 font-mono text-xs leading-5" placeholder={"# 创作方法：方法名称\n\n## 基本信息\n\n- 契约版本：workflow-skill-v1\n- 输出类型：ORAL_VIDEO_SCRIPT"} /></label>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--accent)]"><FileUp size={15} />选择 .md 文件<input type="file" accept=".md,text/markdown,text/plain" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then(setMarkdown); event.currentTarget.value = ""; }} /></label>
      {issues.length ? <div role="alert" className="mt-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-3 text-sm"><strong>这个创作方法还不能导入</strong><ul className="mt-2 list-disc space-y-1 pl-5">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}
      {preview ? <div className="mt-5 grid gap-4 rounded-xl bg-[var(--surface-elevated)] p-4 text-sm">
        <div><strong>{preview.name}</strong><p className="mt-1 text-xs text-[var(--text-secondary)]">短视频口播稿 · 来源：{preview.sourceNote}</p></div>
        <section><h3 className="font-medium">适用场景</h3><List items={preview.scenarios} /></section>
        <section><h3 className="font-medium">执行步骤</h3><List items={preview.steps} /></section>
        <section><h3 className="font-medium">表达规则</h3><List items={preview.expressionRules} /></section>
        <section><h3 className="font-medium">禁止事项</h3><List items={preview.prohibitions} /></section>
        <p className="text-xs text-[var(--text-secondary)]">{preview.hasExamples ? "已包含示例。" : "未包含示例，保存前请确认方法仍然足够清楚。"}</p>
      </div> : null}
      <div className="mt-5 flex flex-wrap gap-2"><Button disabled={busy || !markdown.trim()} onClick={() => void request(false)}>{busy ? "读取中…" : "预览方法"}</Button><Button variant="secondary" disabled={busy || !preview} onClick={() => void request(true)}>保存为创作方法</Button></div>
    </div> : null}
  </section>;
}
