import { Bot, Clock3, Globe2, Link2, Paperclip, Send, X } from "lucide-react";
import type { ReactNode } from "react";

export function AssistantShell({
  title,
  description,
  context,
  children,
  onClose,
  composer = true,
  composerPlaceholder = "有其他想法？可以先写在补充要求里",
}: {
  title: string;
  description: string;
  context?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  composer?: boolean;
  composerPlaceholder?: string;
}) {
  return <div className="assistant-shell">
    <header className="assistant-shell-header">
      <span className="assistant-shell-avatar" aria-hidden="true"><Bot size={22} /></span>
      <div className="min-w-0 flex-1">
        <p className="assistant-shell-kicker">鑫世界 AI 助手</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button type="button" disabled title="对话历史即将支持" aria-label="对话历史即将支持" className="assistant-shell-history"><Clock3 size={18} /></button>
      {onClose ? <button type="button" aria-label="收起 AI 助手" className="assistant-shell-close" onClick={onClose}><X size={19} /></button> : null}
    </header>
    {context ? <section className="assistant-shell-context"><span>当前依据</span>{context}</section> : null}
    <div className="assistant-shell-body">{children}</div>
    {composer ? <footer className="assistant-shell-composer" aria-label="自由对话即将支持">
      <div className="assistant-shell-input">{composerPlaceholder}</div>
      <div className="assistant-shell-tools">
        <button type="button" disabled title="附件即将支持" aria-label="上传附件即将支持"><Paperclip size={17} /></button>
        <button type="button" disabled title="联网搜索即将支持" aria-label="联网搜索即将支持"><Globe2 size={17} /></button>
        <button type="button" disabled title="引用资料即将支持" aria-label="引用资料即将支持"><Link2 size={17} /></button>
        <span>自由对话即将支持</span>
        <button type="button" disabled className="assistant-shell-send" aria-label="发送即将支持"><Send size={17} /></button>
      </div>
    </footer> : null}
  </div>;
}
