"use client";

import { Button, Input } from "@content-center/ui";
import { useState } from "react";

type Profile = {
  displayName: string; positioning: string; targetAudience: string; tone: string; preferredStyle: string; forbiddenStyle: string;
  coreTopics: string[]; personalViews: string[]; brandTerms: string[]; forbiddenTerms: string[]; hookPreferences: string[];
  structurePreferences: string[]; ctaPreferences: string[]; examplePhrases: string[]; notes: string;
};

export function CreatorProfileForm({ initial, editable = true }: { initial: Profile; editable?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(formData: FormData) {
    setBusy(true); setMessage("正在保存");
    const value = (name: string) => String(formData.get(name) || "");
    const lines = (name: string) => value(name).split("\n").map((item) => item.trim()).filter(Boolean);
    try {
      const response = await fetch("/api/creator-profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: value("displayName"), positioning: value("positioning"), targetAudience: value("targetAudience"), tone: value("tone"), preferredStyle: value("preferredStyle"), forbiddenStyle: value("forbiddenStyle"), coreTopics: lines("coreTopics"), personalViews: lines("personalViews"), brandTerms: lines("brandTerms"), forbiddenTerms: lines("forbiddenTerms"), hookPreferences: lines("hookPreferences"), structurePreferences: lines("structurePreferences"), ctaPreferences: lines("ctaPreferences"), examplePhrases: lines("examplePhrases"), notes: value("notes") }) });
      const result = await response.json().catch(() => ({}));
      setMessage(response.ok ? "已保存" : result.message || result.error || "保存失败");
    } catch { setMessage("保存失败"); }
    finally { setBusy(false); }
  }
  return <form action={save} className="grid gap-5"><fieldset disabled={!editable} className="contents"><Field name="displayName" label="显示名称" value={initial.displayName} /><Area name="positioning" label="我的定位" value={initial.positioning} /><Area name="targetAudience" label="目标受众" value={initial.targetAudience} /><Area name="coreTopics" label="常做领域（每行一项）" value={initial.coreTopics.join("\n")} /><Area name="tone" label="表达语气" value={initial.tone} /><Area name="preferredStyle" label="喜欢的表达方式" value={initial.preferredStyle} /><Area name="forbiddenStyle" label="不喜欢的表达方式" value={initial.forbiddenStyle} /><Area name="personalViews" label="常用观点（每行一项）" value={initial.personalViews.join("\n")} /><Area name="brandTerms" label="品牌词（每行一项）" value={initial.brandTerms.join("\n")} /><Area name="forbiddenTerms" label="禁用词（每行一项）" value={initial.forbiddenTerms.join("\n")} /><Area name="hookPreferences" label="开头偏好（每行一项）" value={initial.hookPreferences.join("\n")} /><Area name="structurePreferences" label="结构偏好（每行一项）" value={initial.structurePreferences.join("\n")} /><Area name="ctaPreferences" label="CTA 偏好（每行一项）" value={initial.ctaPreferences.join("\n")} /><Area name="examplePhrases" label="示例表达（每行一项）" value={initial.examplePhrases.join("\n")} /><Area name="notes" label="补充说明" value={initial.notes} />{message ? <p role="status" className="text-sm text-[var(--text-secondary)]">{message}</p> : null}<div><Button disabled={busy || !editable}>{busy ? "正在保存…" : "保存创作画像"}</Button></div></fieldset></form>;
}

function Field({ name, label, value }: { name: string; label: string; value: string }) { return <label className="grid gap-2 text-sm font-medium">{label}<Input name={name} defaultValue={value} maxLength={10_000} /></label>; }
function Area({ name, label, value }: { name: string; label: string; value: string }) { return <label className="grid gap-2 text-sm font-medium">{label}<textarea name={name} aria-label={label} defaultValue={value} rows={3} maxLength={10_000} className="rounded-[var(--radius)] border bg-[var(--surface)] p-3 font-normal leading-6 outline-none focus:border-[var(--accent)]" /></label>; }
