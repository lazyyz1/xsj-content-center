"use client";

import { Button } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserLifecycleActions({ userId, disabled, canChange = true }: { userId: string; disabled: boolean; canChange?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function change() {
    if (!disabled && !window.confirm("停用后该用户将无法登录，现有登录会话也会失效。确定继续吗？")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ disabled: !disabled }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "操作失败");
      setMessage(disabled ? "已恢复" : "已停用"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "操作失败"); }
    finally { setBusy(false); }
  }
  if (!canChange) return null;
  return <div className="flex items-center gap-2"><Button variant="ghost" className="h-8 px-2 text-xs" disabled={busy} onClick={() => void change()}>{busy ? "处理中…" : disabled ? "恢复" : "停用"}</Button>{message ? <span role="status" className="text-xs text-[var(--text-secondary)]">{message}</span> : null}</div>;
}
