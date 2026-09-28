"use client";
import { Button, Card, Input } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
type Member = { id: string; role: string; disabled: boolean; createdAt: string; user: { id: string; name: string; email: string } };
const labels: Record<string, string> = { OWNER: "所有者", ADMIN: "管理员", EDITOR: "普通成员", VIEWER: "只读成员" };
export function MemberSettings({ members, actorId, owner }: { members: Member[]; actorId: string; owner: boolean }) {
  const router = useRouter(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true); setMessage("");
    try { const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const result = await response.json(); if (!response.ok) { setMessage(result.message || "操作失败，请刷新后重试。"); return false; } setMessage("成员设置已更新。"); router.refresh(); return true; } catch { setMessage("网络连接失败，请重试。"); return false; } finally { setBusy(false); }
  }
  const roles = owner ? ["ADMIN", "EDITOR", "VIEWER"] : ["EDITOR", "VIEWER"];
  return <div className="grid gap-6">
    <details className="settings-member-add"><summary>添加成员</summary><Card className="mt-4 p-6"><h2 className="mb-2 font-semibold">添加成员</h2><p className="mb-4 text-sm text-[var(--text-secondary)]">创建鑫世界登录账号并加入当前公司。请通过可信渠道告知成员初始密码，首次登录后可在“我的账号”修改。</p>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); if (await mutate("/api/settings/members", "POST", data)) { form.reset(); const details = form.closest("details"); if (details) details.open = false; } }}>
        <label>姓名<Input name="name" minLength={2} maxLength={80} required /></label><label>登录邮箱<Input name="email" type="email" autoComplete="off" required /></label><label>初始密码<Input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><label>初始角色<select name="role" defaultValue="EDITOR" className="ml-3 rounded border p-2">{roles.map(role => <option key={role} value={role}>{labels[role]}</option>)}</select></label><Button disabled={busy}>添加成员</Button>
      </form>
    </Card></details>
    <p role="status">{message}</p>{members.length <= 1 ? <p>公司还没有其他成员，可以在上方添加。</p> : null}
    <Card className="divide-y overflow-x-auto">{members.map(member => {
      const editable = member.role !== "OWNER" && member.user.id !== actorId && (owner || member.role !== "ADMIN");
      return <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium">{member.user.name}{member.user.id === actorId ? "（你）" : ""}</p><p className="text-sm">{member.user.email}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{member.disabled ? "已停用" : "正常"} · 加入于 {member.createdAt.slice(0, 10)}</p></div><div className="flex flex-wrap items-center gap-3">{editable ? <><select aria-label={`${member.user.name}的角色`} value={member.role} disabled={busy} onChange={event => void mutate(`/api/settings/members/${member.id}`, "PATCH", { role: event.target.value })} className="rounded border p-2">{roles.map(role => <option key={role} value={role}>{labels[role]}</option>)}</select><Button variant="secondary" disabled={busy} onClick={() => void mutate(`/api/settings/members/${member.id}`, "PATCH", { disabled: !member.disabled })}>{member.disabled ? "恢复" : "停用"}</Button><Button variant="ghost" disabled={busy} onClick={() => { if (window.confirm(`移除 ${member.user.name} 后，对方将不能访问当前公司；已创建的项目和资料会保留。确定移除？`)) void mutate(`/api/settings/members/${member.id}`, "DELETE"); }}>移除</Button></> : <span>{labels[member.role]}</span>}</div></div>;
    })}</Card><p className="text-sm text-[var(--text-secondary)]">所有者管理管理员；管理员管理普通和只读成员。只读成员不能写入内容或执行 AI / 研究任务。所有者和自己的权限不可在此修改。</p>
  </div>;
}
