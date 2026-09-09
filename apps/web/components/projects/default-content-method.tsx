"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { defaultContentMethodSectionCodes, type DefaultContentMethodSection } from "@/server/default-content-method/schemas";
import type { DefaultContentMethodDTO, DefaultContentMethodVersionDTO } from "@/server/default-content-method/service";

const labels = {
  AUDIENCE: "我们主要给谁做内容",
  TOPIC: "什么样的选题优先做",
  OPENING: "开头怎么进入",
  BODY: "正文怎么讲",
  EVIDENCE: "案例和数据怎么用",
  ENDING: "怎么收尾",
  BOUNDARY: "哪些事情不要做",
} as const;

async function request(method: string, body?: unknown) {
  const result = await fetch("/api/methods/default", { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(data.message || "默认创作方法暂时无法操作。");
  return data as DefaultContentMethodDTO;
}

function fields(version: DefaultContentMethodVersionDTO | null) {
  return Object.fromEntries(defaultContentMethodSectionCodes.map((code) => [code, version?.sections.find((section) => section.code === code)?.items.map(({ text }) => text).join("\n") ?? ""])) as Record<typeof defaultContentMethodSectionCodes[number], string>;
}

function lines(value: string) {
  return value.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean);
}

export function DefaultContentMethod({ initial, editable }: { initial: DefaultContentMethodDTO; editable: boolean }) {
  const router = useRouter();
  const [method, setMethod] = useState(initial);
  const [content, setContent] = useState(() => fields(initial.draft));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const current = method.current;
  const draft = method.draft;
  const sections = current?.sections ?? [];
  const draftSections = useMemo((): DefaultContentMethodSection[] => defaultContentMethodSectionCodes.map((code) => {
    const previous = draft?.sections.find((section) => section.code === code)?.items ?? [];
    return { code, items: lines(content[code]).map((text, index) => ({ text, sourceRefs: previous[index]?.text === text ? previous[index].sourceRefs : [] })) };
  }), [content, draft]);

  async function run(action: () => Promise<DefaultContentMethodDTO>, message: string) {
    setBusy(true); setError(""); setNotice("");
    try { const next = await action(); setMethod(next); setContent(fields(next.draft)); setNotice(message); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "默认创作方法暂时无法操作。"); }
    finally { setBusy(false); }
  }

  return <Card className="mb-8 p-5" data-testid="default-content-method">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">鑫世界默认创作方法</h2>{current ? <Badge>当前版本 V{current.version}</Badge> : <Badge>尚未发布</Badge>}</div><p className="mt-2 text-sm text-[var(--text-secondary)]">公司正式采用的内容创作指南。它帮助做判断，不是强制模板。</p>{method.updatedAt ? <p className="mt-1 text-xs text-[var(--text-secondary)]">最近更新：{new Date(method.updatedAt).toLocaleString("zh-CN")}</p> : null}</div>{editable && !draft ? <Button disabled={busy} onClick={() => void run(() => request("POST", { action: "CREATE_DRAFT" }), current ? "新版本草稿已创建。" : "初始草稿已创建。")}>{current ? "创建新版本" : "创建初始草稿"}</Button> : null}</div>
    {current ? <GuideSections sections={sections} /> : <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-[var(--text-secondary)]">默认创作方法尚未正式发布。现有个人方法和 Studio 创作不会受到影响。</div>}
    {draft && editable ? <section className="mt-6 border-t pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">新版本草稿 V{draft.version}</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">每行一条简短建议。正式发布前，每条建议都需要保留依据。</p></div><Badge>草稿</Badge></div><div className="mt-4 grid gap-4 md:grid-cols-2">{defaultContentMethodSectionCodes.map((code) => <label key={code} className="grid gap-1.5 text-sm"><span className="font-medium">{labels[code]}</span><textarea aria-label={`${labels[code]}草稿`} value={content[code]} onChange={(event) => setContent((current) => ({ ...current, [code]: event.target.value }))} className="min-h-28 resize-y rounded-xl border bg-transparent p-3 leading-6" placeholder="暂未填写" /></label>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void run(() => request("PUT", { version: draft.version, sections: draftSections }), "草稿已保存。")} >保存草稿</Button><Button variant="secondary" disabled={busy} onClick={() => void run(() => request("PATCH", { action: "PUBLISH", version: draft.version }), "新版本已正式发布。")} >发布新版本</Button></div></section> : null}
    {current ? <details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-sm font-medium text-[var(--accent)]">查看依据</summary><EvidenceSummary sections={sections} /></details> : null}
    {method.history.length ? <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-[var(--accent)]">历史版本（{method.history.length}）</summary><div className="mt-3 grid gap-2">{method.history.map((version) => <div key={version.id} className="rounded-xl bg-[var(--surface-elevated)] p-3 text-sm"><span className="font-medium">V{version.version}</span><span className="ml-2 text-[var(--text-secondary)]">{version.publishedAt ? new Date(version.publishedAt).toLocaleString("zh-CN") : ""}</span></div>)}</div></details> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}{notice ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{notice}</p> : null}
  </Card>;
}

function GuideSections({ sections }: { sections: DefaultContentMethodSection[] }) {
  return <div className="mt-5 grid gap-3 md:grid-cols-2">{defaultContentMethodSectionCodes.map((code) => { const section = sections.find((item) => item.code === code); return <section key={code} className="rounded-xl border p-4"><h3 className="font-medium">{labels[code]}</h3>{section?.items.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--text-secondary)]">{section.items.map((item) => <li key={item.text}>{item.text}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--text-secondary)]">暂未填写</p>}</section>; })}</div>;
}

function EvidenceSummary({ sections }: { sections: DefaultContentMethodSection[] }) {
  const sources = sections.flatMap(({ items }) => items.flatMap(({ sourceRefs }) => sourceRefs)).filter((source, index, all) => all.findIndex((candidate) => candidate.type === source.type && candidate.referenceId === source.referenceId) === index);
  return sources.length ? <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">{sources.map((source) => <li key={`${source.type}-${source.referenceId}`}>{source.label}</li>)}</ul> : <p className="mt-3 text-sm text-[var(--text-secondary)]">当前版本还没有可查看的依据。</p>;
}
