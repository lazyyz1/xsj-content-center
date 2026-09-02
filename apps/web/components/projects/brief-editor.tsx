"use client";

import { Button } from "@content-center/ui";

export type MySupplement = { coreMessage: string; audience: string; background: string; angle: string };

export function BriefEditor({ value, editable, busy, message, onChange, onSave }: { value: MySupplement; editable: boolean; busy: boolean; message: string; onChange: (value: MySupplement) => void; onSave: () => void }) {
  return <section id="my-supplement" aria-labelledby="my-supplement-title"><div><h2 id="my-supplement-title" className="font-semibold">2. 我的补充</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">这里写的是你的观点、经历和要求。参考素材里的案例不会自动变成你的经历。</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="我的核心观点" value={value.coreMessage} onChange={(coreMessage) => onChange({ ...value, coreMessage })} area disabled={!editable} /><Field label="给谁看" value={value.audience} onChange={(audience) => onChange({ ...value, audience })} disabled={!editable} /><Field label="我们自己的业务 / 经历 / 案例" value={value.background} onChange={(background) => onChange({ ...value, background })} area disabled={!editable} /><Field label="其他要求 / 我想怎么讲" value={value.angle} onChange={(angle) => onChange({ ...value, angle })} area disabled={!editable} /></div>{editable ? <div className="mt-5 flex items-center gap-3"><Button variant="secondary" disabled={busy} onClick={onSave}>{busy ? "保存中…" : "保存我的补充"}</Button>{message ? <p role="status" className="text-xs text-[var(--text-secondary)]">{message}</p> : null}</div> : null}</section>;
}

function Field({ label, value, onChange, area, disabled }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; disabled: boolean }) { const classes = "rounded-[var(--radius)] border bg-[var(--surface)] p-3 text-sm font-normal leading-6 outline-none focus:border-[var(--accent)]"; return <label className="grid gap-1.5 text-xs font-medium">{label}{area ? <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} rows={4} className={classes} /> : <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={`h-11 ${classes}`} />}</label>; }
