"use client";

import { Button } from "@content-center/ui";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Kind = "TEXT" | "URL" | "DOUYIN";

export function IngestDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("TEXT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ sourceItemId: string } | null>(null);
  const [existingSourceId, setExistingSourceId] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    setExistingSourceId(null);
    const payload = kind === "TEXT"
      ? { kind, title: formData.get("title"), text: formData.get("text"), notes: formData.get("notes") }
      : kind === "URL"
        ? { kind, url: formData.get("url") }
        : { kind, shareText: formData.get("shareText") };
    const response = await fetch("/api/source-items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.message || body.error || "收录失败，请检查输入。");
      if (body.error === "DUPLICATE_SOURCE" && typeof body.sourceItemId === "string") setExistingSourceId(body.sourceItemId);
      setBusy(false);
      return;
    }
    setCreated({ sourceItemId: body.sourceItemId });
    setBusy(false);
    router.refresh();
  }

  function close() {
    setOpen(false);
    setCreated(null);
    setError("");
    setExistingSourceId(null);
    setKind("TEXT");
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> 收录内容</Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="ingest-title" className="w-full max-w-2xl rounded-2xl border bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="ingest-title" className="text-xl font-semibold">收录内容</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">提交后会自动提取并整理内容；处理期间可以离开此页面。</p></div>
              <button aria-label="关闭" onClick={close} className="rounded-lg p-2 hover:bg-[var(--surface-elevated)]"><X size={18} /></button>
            </div>
            {created ? (
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
                <p className="font-medium text-blue-900">处理中</p>
                <p className="mt-1 text-sm text-blue-800">内容已提交，页面会自动更新处理状态。</p>
                <Link className="mt-4 inline-block text-sm font-medium text-[var(--accent)] underline" href={`/library/${created.sourceItemId}`} onClick={close}>查看素材</Link>
              </div>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-[var(--surface-elevated)] p-1">
                  {(["TEXT", "URL", "DOUYIN"] as const).map((value) => <button key={value} onClick={() => { setKind(value); setError(""); }} className={`rounded-lg px-3 py-2 text-sm ${kind === value ? "bg-[var(--surface)] font-medium shadow-sm" : "text-[var(--text-secondary)]"}`}>{value === "TEXT" ? "粘贴文本" : value === "URL" ? "网页链接" : "抖音视频"}</button>)}
                </div>
                <form action={submit} className="mt-5 grid gap-4">
                  {kind === "TEXT" ? <>
                    <label className="grid gap-1.5 text-sm">标题（可选）<input name="title" maxLength={200} className="h-10 rounded-[var(--radius)] border bg-transparent px-3" /></label>
                    <label className="grid gap-1.5 text-sm">正文<textarea name="text" required rows={9} className="rounded-[var(--radius)] border bg-transparent p-3 leading-6" /></label>
                    <label className="grid gap-1.5 text-sm">备注（可选）<textarea name="notes" rows={2} className="rounded-[var(--radius)] border bg-transparent p-3" /></label>
                  </> : kind === "URL" ? (
                    <label className="grid gap-1.5 text-sm">网页链接<input name="url" type="url" required placeholder="https://example.com/article" className="h-10 rounded-[var(--radius)] border bg-transparent px-3" /></label>
                  ) : (
                    <label className="grid gap-1.5 text-sm">抖音分享链接或分享文案<textarea name="shareText" required rows={5} maxLength={10000} placeholder={'3.21 复制打开抖音，看看这个作品…\nhttps://v.douyin.com/xxxx/'} className="rounded-[var(--radius)] border bg-transparent p-3 leading-6" /><span className="text-xs text-[var(--text-secondary)]">仅支持一个明确的抖音作品链接；需先在设置中配置 RedFox。</span></label>
                  )}
                  {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}{existingSourceId ? <> <Link href={`/library/${existingSourceId}`} onClick={close} className="underline">查看已有素材</Link></> : null}</p> : null}
                  <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={close}>取消</Button><Button type="submit" disabled={busy}>{busy ? "提交中…" : "提交收录"}</Button></div>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
