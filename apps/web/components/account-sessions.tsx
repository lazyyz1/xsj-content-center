"use client";
import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
type Session = { id: string; current: boolean; device: string; lastActive: string };
export function AccountSessions() {
  const [sessions, setSessions] = useState<Session[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [expanded,setExpanded] = useState(false);
  async function load() { const response = await fetch("/api/settings/sessions"); if (!response.ok) throw new Error(); const data = await response.json(); setSessions(data.sessions); }
  useEffect(() => { load().catch(() => setMessage("无法读取登录设备，请刷新后重试。")); }, []);
  async function revoke(body: unknown) {
    setBusy(true); setMessage("");
    try { const response = await fetch("/api/settings/sessions", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(); setMessage(data.message); await load(); } catch { setMessage("操作失败，请重试。"); } finally { setBusy(false); }
  }
  return <section className="settings-security"><div className="settings-section-heading"><h2>登录设备</h2><button className="settings-small-action" disabled={busy || !sessions.some(session => !session.current)} onClick={() => void revoke({ allOthers: true })}>退出其他设备</button></div><div className="settings-info-table">{sessions.slice(0,expanded?sessions.length:3).map(session => <div key={session.id}><span><Monitor size={15}/><span>{session.device}<small>最近活动：{new Date(session.lastActive).toLocaleString("zh-CN")}</small></span></span>{session.current ? <span className="settings-current-tag">当前设备</span> : <button className="settings-small-action" disabled={busy} onClick={() => void revoke({ id: session.id })}>退出</button>}</div>)}</div>{sessions.length>3 ? <button className="settings-small-action mt-3" onClick={()=>setExpanded(!expanded)}>{expanded?"收起设备列表":`查看其他 ${sessions.length-3} 个登录`}</button> : null}{message ? <p role="status" className="mt-3">{message}</p> : null}</section>;
}
