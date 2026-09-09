import { ArrowRight, Bot, MessageSquareText, Sparkles } from "lucide-react";
import Link from "next/link";

export type AssistantAction = { label: string; href: string };

export function WorkspaceAssistant({ title = "鑫小助", description, actions, compact = false }: { title?: string; description: string; actions: AssistantAction[]; compact?: boolean }) {
  return <aside className={`workspace-assistant workspace-panel ${compact ? "workspace-assistant-compact" : ""}`} aria-label={`${title}助手`}>
    <div className="assistant-avatar"><Bot size={24} /></div>
    <h2>{title}</h2>
    <p>{description}</p>
    <div className="assistant-actions">{actions.map((action) => <Link key={`${action.href}-${action.label}`} href={action.href}><Sparkles size={15} /><span>{action.label}</span><ArrowRight size={15} /></Link>)}</div>
    <div className="assistant-composer assistant-composer-disabled" aria-label="自由对话即将支持"><MessageSquareText size={17} /><span>自由对话即将支持</span></div>
    <small>当前页面的真实能力会直接显示；未接入的动作不会假装成功。</small>
  </aside>;
}
