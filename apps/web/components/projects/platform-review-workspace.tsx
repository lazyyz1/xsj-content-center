"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLATFORM_LABELS, type SupportedPlatform } from "@/lib/platforms";
import type { QualityIssue } from "@/server/reviews/schemas";

type ReviewRecordView = { id: string; result: "PENDING" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED"; issues: QualityIssue[]; comment: string | null; aiReviewed: boolean; aiRunId: string | null; aiOutput: unknown; reviewer: { id: string; name: string }; createdAt: string };

export type PlatformReviewView = {
  project: { id: string; title: string };
  variant: { id: string; platform: SupportedPlatform; version: number; title: string | null; hook: string | null; body: string; summary: string | null; hashtags: string[]; metadata: unknown; status: string; sourceMotherVersion: number };
  motherContent: { title: string; version: number; origin: "HUMAN" | "KIMI" | "GPT_WEB" };
  deepContentPackage: { version: number; status: string } | null;
  evidenceCount: number;
  quality: { passed: boolean; issues: QualityIssue[] };
  records: ReviewRecordView[];
  canReview: boolean;
  readyToPublish: boolean;
  isStale: boolean;
};

const RESULT_LABELS = { PENDING: "待审核", CHANGES_REQUESTED: "退回修改", APPROVED: "已批准", REJECTED: "已拒绝" } as const;

function aiSummary(records: ReviewRecordView[]) {
  for (const record of records) {
    const value = record.aiOutput;
    if (value && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>).summary === "string") return (value as Record<string, string>).summary;
  }
  return "";
}

export function PlatformReviewWorkspace({ initial, integrationStatus }: { initial: PlatformReviewView; integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "DISABLED" | "ERROR" | "MOCK" }) {
  const router = useRouter();
  const [issues, setIssues] = useState(initial.records[0]?.result === "PENDING" ? initial.records[0].issues : initial.quality.issues);
  const [summary, setSummary] = useState(aiSummary(initial.records));
  const [comment, setComment] = useState("");
  const [confirmWarnings, setConfirmWarnings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const hasError = issues.some(({ severity }) => severity === "ERROR");
  const hasWarning = issues.some(({ severity }) => severity === "WARNING");
  const aiConfigured = integrationStatus === "CONFIGURED" || integrationStatus === "MOCK";

  async function call(action: string, body: unknown = {}) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/projects/${initial.project.id}/platform-variants/${initial.variant.platform}/review/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "审核操作失败");
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "审核操作失败");
      return null;
    } finally { setBusy(false); }
  }

  async function runAI() {
    const result = await call("ai") as { issues: QualityIssue[]; summary: string } | null;
    if (!result) return;
    setIssues(result.issues); setSummary(result.summary); setMessage("AI 检查已完成，仅生成审核建议。"); router.refresh();
  }

  async function decide(action: "approve" | "request-changes" | "reject") {
    const result = await call(action, action === "approve" ? { comment, confirmWarnings } : { comment });
    if (!result) return;
    setMessage(action === "approve" ? "已人工批准。" : action === "reject" ? "已拒绝并退回草稿。" : "已退回修改。");
    router.refresh();
  }

  return <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
    <div className="grid gap-5">
      {initial.isStale && initial.variant.status === "APPROVED" ? <Card className="border-[var(--warning)] p-5"><p className="font-semibold text-[var(--warning)]">此前已批准，但母稿已经更新</p><p className="mt-1 text-sm text-[var(--text-secondary)]">该版本不能视为可发布；请基于新版母稿重新生成并审核。</p></Card> : null}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">{PLATFORM_LABELS[initial.variant.platform]}平台内容</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">v{initial.variant.version} · 状态 {initial.variant.status}</p></div><Badge>{initial.readyToPublish ? "已批准且未过期" : initial.isStale ? "母稿已更新" : initial.variant.status}</Badge></div>
        {initial.variant.title ? <section className="mt-5"><p className="text-xs text-[var(--text-secondary)]">标题</p><p className="mt-2 font-medium">{initial.variant.title}</p></section> : null}
        {initial.variant.hook ? <section className="mt-5"><p className="text-xs text-[var(--text-secondary)]">Hook</p><p className="mt-2">{initial.variant.hook}</p></section> : null}
        <section className="mt-5"><p className="text-xs text-[var(--text-secondary)]">正文</p><p className="mt-2 whitespace-pre-wrap leading-7">{initial.variant.body}</p></section>
        {initial.variant.hashtags.length ? <section className="mt-5"><p className="text-xs text-[var(--text-secondary)]">标签</p><div className="mt-2 flex flex-wrap gap-2">{initial.variant.hashtags.map((tag, index) => <Badge key={`${tag}-${index}`}>#{tag.replace(/^#/, "")}</Badge>)}</div></section> : null}
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Quality Gate</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">确定性规则按需计算，不在 autosave 时写库。</p>
        <IssueList issues={issues} />
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">审核历史</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">保留每次提交和人工结论</p></div><Badge>{initial.records.length} 条</Badge></div>
        <div className="mt-4 grid gap-3">{initial.records.length ? initial.records.map((record) => <div key={record.id} className="rounded-xl border p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p><strong>{record.reviewer.name}</strong> · {RESULT_LABELS[record.result]}</p><time className="text-xs text-[var(--text-secondary)]">{new Date(record.createdAt).toLocaleString("zh-CN")}</time></div>{record.comment ? <p className="mt-2 text-[var(--text-secondary)]">{record.comment}</p> : null}{record.aiReviewed ? <p className="mt-2 text-xs text-[var(--accent)]">包含 AI Review 建议</p> : null}</div>) : <p className="text-sm text-[var(--text-secondary)]">暂无审核记录。</p>}</div>
      </Card>
    </div>
    <div className="grid gap-5">
      <Card className="p-5"><h2 className="font-semibold">来源信息</h2><dl className="mt-4 grid gap-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-[var(--text-secondary)]">MotherContent origin</dt><dd>{initial.motherContent.origin}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--text-secondary)]">母稿版本</dt><dd>v{initial.motherContent.version}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--text-secondary)]">Deep Content Package</dt><dd>{initial.deepContentPackage ? `v${initial.deepContentPackage.version}` : "无"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--text-secondary)]">正式 Evidence</dt><dd>{initial.evidenceCount}</dd></div></dl><p className="mt-4 text-xs text-[var(--text-secondary)]">来源类型只作展示，不改变审核严格程度。</p></Card>
      <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">AI Review</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Kimi / Workspace LLM · 仅建议</p></div><Badge>{integrationStatus}</Badge></div>{summary ? <p className="mt-4 rounded-xl border p-3 text-sm leading-6">{summary}</p> : null}{!aiConfigured ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{integrationStatus === "DISABLED" ? "AI 模型已禁用。" : "UNCONFIGURED：尚未配置 Workspace LLM。"}</p> : null}{initial.canReview && initial.variant.status === "IN_REVIEW" ? <Button className="mt-4 w-full" disabled={busy || !aiConfigured} onClick={runAI}>运行 AI 检查</Button> : null}<p className="mt-3 text-xs text-[var(--text-secondary)]">不会自动批准、拒绝或修改正文。</p></Card>
      <Card className="p-5"><h2 className="font-semibold">人工审核</h2>{initial.canReview && initial.variant.status === "IN_REVIEW" ? <div className="mt-4 grid gap-4"><label className="text-sm">审核备注<textarea aria-label="审核备注" value={comment} onChange={(event) => setComment(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border bg-transparent p-3" placeholder="退回修改时至少填写 2 个字符" /></label>{hasWarning ? <label className="flex items-start gap-2 text-sm"><input aria-label="确认已知风险" type="checkbox" checked={confirmWarnings} onChange={(event) => setConfirmWarnings(event.target.checked)} /><span>我已核对 WARNING，并确认承担已知风险。</span></label> : null}<Button disabled={busy || hasError || (hasWarning && !confirmWarnings)} onClick={() => decide("approve")}>批准</Button><div className="grid grid-cols-2 gap-2"><Button variant="secondary" disabled={busy || comment.trim().length < 2} onClick={() => decide("request-changes")}>退回修改</Button><Button variant="ghost" disabled={busy} onClick={() => decide("reject")}>拒绝</Button></div></div> : <p className="mt-3 text-sm text-[var(--text-secondary)]">{initial.variant.status === "IN_REVIEW" ? "当前角色只读，不能执行人工审核。" : `当前状态：${initial.variant.status}`}</p>}{error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}{message ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{message}</p> : null}</Card>
    </div>
  </div>;
}

function IssueList({ issues }: { issues: QualityIssue[] }) {
  if (!issues.length) return <p className="mt-4 rounded-xl border border-[var(--success)] p-4 text-sm text-[var(--success)]">未发现规则问题。</p>;
  return <div className="mt-4 grid gap-3">{issues.map((item, index) => <div key={`${item.source}-${item.code}-${index}`} className="rounded-xl border p-4 text-sm"><div className="flex flex-wrap items-center gap-2"><Badge>{item.severity}</Badge><Badge>{item.source}</Badge><strong>{item.code}</strong></div><p className="mt-2">{item.message}</p>{item.suggestion ? <p className="mt-2 text-xs text-[var(--text-secondary)]">建议：{item.suggestion}</p> : null}</div>)}</div>;
}
