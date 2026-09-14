"use client";

import { Button } from "@content-center/ui";
import { Check, ChevronDown, FilePlus2, FileText, Link2, LoaderCircle, Paperclip, RefreshCw, Save, Search, Send, Square, X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { StudioActionRecommendation } from "@/server/ai/schemas";
import type { AssistantMessageDTO, AssistantResultAction, AssistantStreamEvent, NodeAssistantStreamEvent } from "@/server/assistant/service";
import type { CanvasObjectDTO } from "@/server/canvas/service";
import type { ProjectMaterial } from "./project-materials-panel";
import type { StudioSelectionAction } from "./mother-content-editor";
import { AssistantResultRenderer } from "./assistant-result-renderer";

type TextSelection = { text: string; start: number; end: number };
type SelectedCanvasReference = { objectType: "CANVAS_OBJECT"; objectId: string; version: number; ownership: "EXTERNAL" | "PENDING"; whySelected: string; label: string };
export type StudioAssistantHandle = { executeSelection: (action: StudioSelectionAction) => void };
type Props = { projectId: string; recommendedActions: StudioActionRecommendation[]; editable: boolean; configured: boolean; selection?: TextSelection | null; selectedObject?: SelectedCanvasReference | null; projectMaterials: ProjectMaterial[]; canvasObjects: CanvasObjectDTO[]; onClose: () => void; onObjectCreated: (object: CanvasObjectDTO) => void };

const actionPrompts: Record<StudioSelectionAction, string> = {
  HUMANIZE_TEXT: "请把这段内容改得更自然、更像本人表达：",
  SHORTEN_TEXT: "请精简这段内容，保留核心观点和依据：",
  ALTERNATIVE_EXPRESSION: "请换一种表达方式，不改变事实：",
  STRENGTHEN_EVIDENCE: "请检查这段内容还缺哪些真实依据，不要编造案例或数字：",
  FACT_CHECK: "请检查这段内容有没有把外部信息说成我们自己的信息：",
};
const saveLabels: Record<AssistantResultAction, string> = { TEXT: "保存为文本", TOPIC: "保存为选题", DRAFT: "创建候选稿" };

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "操作失败，请重试。");
  return result;
}

export const StudioDefaultMethod = forwardRef<StudioAssistantHandle, Props>(function StudioDefaultMethod({ projectId, recommendedActions, editable, configured, selection, selectedObject, projectMaterials, canvasObjects, onClose, onObjectCreated }, ref) {
  const [messages, setMessages] = useState<AssistantMessageDTO[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [additionalObjectIds, setAdditionalObjectIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const lastPromptRef = useRef("");
  const createdObjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const preserveCreatedResult = selectedObject?.objectId === createdObjectIdRef.current;
    setLoading(true);
    if (!preserveCreatedResult) { setMessages([]); setError(""); }
    const url = selectedObject ? `/api/projects/${projectId}/canvas/objects/${selectedObject.objectId}/assistant` : `/api/projects/${projectId}/assistant`;
    void jsonRequest(url).then((thread: { messages?: AssistantMessageDTO[] }) => { if (!active) return; if (thread.messages?.length || !preserveCreatedResult) setMessages(thread.messages ?? []); if (preserveCreatedResult) createdObjectIdRef.current = null; }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "对话记录加载失败。"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; abortRef.current?.abort(); };
  }, [projectId, selectedObject?.objectId]);

  useEffect(() => {
    const element = streamRef.current;
    if (element && element.scrollHeight - element.scrollTop - element.clientHeight < 180) element.scrollTo({ top: element.scrollHeight, behavior: sending ? "auto" : "smooth" });
  }, [messages, sending]);

  const visibleMaterials = useMemo(() => {
    const needle = materialSearch.trim().toLocaleLowerCase("zh-CN");
    return projectMaterials.filter((source) => !needle || [source.title, source.description, source.summary, source.author].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN").includes(needle)).slice(0, 20);
  }, [materialSearch, projectMaterials]);
  const visibleCanvasObjects = useMemo(() => { const needle = materialSearch.trim().toLocaleLowerCase("zh-CN"); return canvasObjects.filter((object) => object.id !== selectedObject?.objectId && !object.deletedAt && (!needle || [object.title, object.textContent].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN").includes(needle))).slice(0, 12); }, [canvasObjects, materialSearch, selectedObject?.objectId]);

  const send = async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || sending || !configured || (selectedObject && !editable)) return;
    setSending(true); setError(""); setNotice(""); lastPromptRef.current = content;
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const url = selectedObject ? `/api/projects/${projectId}/canvas/objects/${selectedObject.objectId}/assistant` : `/api/projects/${projectId}/assistant`;
      const body = selectedObject ? { instruction: content, ...(additionalObjectIds.length ? { additionalObjectIds } : {}), ...(materialIds.length ? { sourceItemIds: materialIds } : {}) } : { content, ...(materialIds.length ? { sourceItemIds: materialIds } : {}) };
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      if (!response.ok || !response.body) { const body = await response.json().catch(() => ({})); throw new Error(body.message || "当前 AI 服务暂时不可用，请稍后再试。"); }
      setInput(""); setMaterialIds([]); setAdditionalObjectIds([]); setMaterialOpen(false);
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((part) => part.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as AssistantStreamEvent | NodeAssistantStreamEvent;
          if (event.type === "start") setMessages((current) => [...current, event.userMessage, event.assistantMessage]);
          else if (event.type === "delta") setMessages((current) => current.map((message) => message.id === event.messageId ? { ...message, status: "STREAMING", content: message.content + event.delta } : message));
          else if (event.type === "done" || event.type === "stopped") { setMessages((current) => current.map((message) => message.id === event.message.id ? event.message : message)); if (event.type === "done" && "resultObject" in event) { createdObjectIdRef.current = event.resultObject.id; onObjectCreated(event.resultObject); } }
          else if (event.type === "error") { setMessages((current) => current.map((message) => message.id === event.messageId ? { ...message, status: "FAILED" } : message)); setError(event.message); }
        }
      }
    } catch (cause) {
      if (controller.signal.aborted) setMessages((current) => current.map((message) => message.status === "STREAMING" || message.status === "PENDING" ? { ...message, status: "STOPPED" } : message));
      else setError(cause instanceof Error ? cause.message : "当前 AI 服务暂时不可用，请稍后再试。");
    } finally { if (abortRef.current === controller) abortRef.current = null; setSending(false); }
  };

  useImperativeHandle(ref, () => ({ executeSelection: (action) => { if (selection) void send(`${actionPrompts[action]}\n\n${selection.text}`); } }));

  const saveResult = async (message: AssistantMessageDTO, action: AssistantResultAction, topicIndex?: number) => {
    setError(""); setNotice("");
    try {
      const result = await jsonRequest(`/api/projects/${projectId}/assistant/messages/${message.id}/save`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...(topicIndex === undefined ? {} : { topicIndex }) }) }) as { object?: CanvasObjectDTO };
      if (result.object) onObjectCreated(result.object);
      setNotice(action === "TEXT" ? "已保存到画布，并选中新文本。" : action === "TOPIC" ? "已保存到选题库。" : "已创建新的候选稿，不会覆盖主稿。");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败，请重试。"); }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } };

  return <div className="studio-project-assistant" data-testid="studio-project-assistant">
    <div className="studio-assistant-stream" ref={streamRef} aria-live="polite">
      {loading ? <div className="studio-assistant-loading"><LoaderCircle size={18} />正在载入项目对话…</div> : null}
      {!loading && !messages.length ? <section className="studio-assistant-empty"><strong>{selectedObject ? `基于“${selectedObject.label}”继续` : "从当前项目继续"}</strong><p>{selectedObject ? "生成结果会成为右侧的新文本，不会覆盖当前内容。" : "我会自动参考项目目标、当前稿件、选中内容和你添加的资料。"}</p><div>{(selectedObject ? ["基于这个给我出 3 个选题", "提炼这个内容的核心观点", "生成另一种表达"] : ["帮我看看这个项目下一步该做什么", "根据当前资料出几个选题", "帮我检查当前稿件"]).map((prompt) => <button type="button" key={prompt} disabled={!configured || Boolean(selectedObject && !editable)} onClick={() => void send(prompt)}>{prompt}</button>)}</div></section> : null}
      {messages.map((message, index) => <article key={message.id} className={`studio-assistant-message is-${message.role.toLowerCase()} is-${message.status.toLowerCase()} ${message.role === "ASSISTANT" && message.structuredResult ? "has-structured-result" : ""}`}>
        <header><strong>{message.role === "USER" ? "你" : "鑫小助"}</strong><time>{new Date(message.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time>{message.status === "STREAMING" ? <span><i />正在回复</span> : message.status === "STOPPED" ? <span>已停止</span> : message.status === "FAILED" ? <span>未完成</span> : null}</header>
        {message.role === "ASSISTANT" ? <AssistantResultRenderer message={message} onContinue={(instruction) => void send(instruction)} onTopicContinue={(topic) => void send(`继续展开这个选题：${topic.title}${topic.angle ? `。切入角度：${topic.angle}` : ""}`)} onTopicSave={(topicIndex) => void saveResult(message, "TEXT", topicIndex)} /> : <div className="studio-assistant-message-content">{message.content || (message.status === "PENDING" ? "正在准备项目上下文…" : "")}</div>}
        {message.warnings.length ? <div className="studio-assistant-warnings" role="alert"><strong>需要确认</strong>{message.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
        {message.sources.length ? <details className="studio-assistant-citations"><summary>来源 {message.sources.length}<ChevronDown size={14} /></summary><div>{message.sources.map((source, sourceIndex) => <section key={`${source.title}-${sourceIndex}`}><span>{source.type}</span><strong>{source.title}</strong><p>{source.excerpt}</p></section>)}</div></details> : null}
        {message.actions.filter((action) => !(message.structuredResult?.type === "TOPIC" && (action === "TEXT" || action === "TOPIC"))).length ? <footer>{message.actions.filter((action) => !(message.structuredResult?.type === "TOPIC" && (action === "TEXT" || action === "TOPIC"))).map((action) => <button type="button" key={action} disabled={!editable} title={editable ? saveLabels[action] : "当前权限只能查看"} onClick={() => void saveResult(message, action)}>{action === "TEXT" ? <Save size={14} /> : action === "TOPIC" ? <Check size={14} /> : <FilePlus2 size={14} />}{saveLabels[action]}</button>)}</footer> : null}
        {message.status === "FAILED" ? <button type="button" className="studio-assistant-retry" disabled={sending} onClick={() => { const previous = messages.slice(0, index).reverse().find((item) => item.role === "USER"); void send(previous?.content || lastPromptRef.current); }}><RefreshCw size={14} />重新试一次</button> : null}
      </article>)}
    </div>

    <div className="studio-assistant-quick-prompts" aria-label="快捷任务">{recommendedActions.slice(0, 3).map((item) => <button type="button" key={`${item.action}-${item.label}`} disabled={sending || !configured} onClick={() => void send([item.label, item.instruction].filter(Boolean).join("："))}>{item.label}</button>)}<button type="button" disabled={sending || !configured} onClick={() => void send("请根据当前项目告诉我下一步最值得做什么")}>下一步建议</button></div>

    <div className="studio-assistant-references">
      {selectedObject ? <span><FileText size={14} />当前正在基于：{selectedObject.label}</span> : null}
      {additionalObjectIds.map((id) => { const object = canvasObjects.find((item) => item.id === id); return object ? <span key={id}><Link2 size={14} />{object.title || "未命名内容"}<button type="button" aria-label={`移除内容 ${object.title || "未命名内容"}`} onClick={() => setAdditionalObjectIds((current) => current.filter((value) => value !== id))}><X size={13} /></button></span> : null; })}
      {materialIds.map((id) => { const source = projectMaterials.find((item) => item.id === id); return source ? <span key={id}><Link2 size={14} />{source.title}<button type="button" aria-label={`移除资料 ${source.title}`} onClick={() => setMaterialIds((current) => current.filter((value) => value !== id))}><X size={13} /></button></span> : null; })}
    </div>

    {materialOpen ? <section className="studio-assistant-material-picker"><header><strong>添加引用</strong><button type="button" aria-label="关闭引用选择" onClick={() => setMaterialOpen(false)}><X size={16} /></button></header><label><Search size={14} /><input autoFocus value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} placeholder="搜索画布内容或项目资料" /></label><div>{selectedObject && visibleCanvasObjects.length ? <p>画布内容</p> : null}{selectedObject ? visibleCanvasObjects.map((object) => <button type="button" key={object.id} aria-pressed={additionalObjectIds.includes(object.id)} onClick={() => setAdditionalObjectIds((current) => current.includes(object.id) ? current.filter((id) => id !== object.id) : [...current, object.id].slice(-5))}><FileText size={15} /><span><strong>{object.title || "未命名内容"}</strong><small>{object.textContent || (object.generatedFrom.length ? `基于 ${object.generatedFrom.length} 项内容生成` : "画布内容")}</small></span>{additionalObjectIds.includes(object.id) ? <Check size={15} /> : null}</button>) : null}{visibleMaterials.length ? <p>项目资料</p> : null}{visibleMaterials.map((source) => <button type="button" key={source.id} aria-pressed={materialIds.includes(source.id)} onClick={() => setMaterialIds((current) => current.includes(source.id) ? current.filter((id) => id !== source.id) : [...current, source.id].slice(-8))}><FileText size={15} /><span><strong>{source.title}</strong><small>{source.summary || source.description || "尚未整理摘要"}</small></span>{materialIds.includes(source.id) ? <Check size={15} /> : null}</button>)}</div></section> : null}

    {error ? <p className="studio-assistant-error" role="alert">{error}</p> : null}{notice ? <p className="studio-assistant-success" role="status">{notice}</p> : null}
    {!configured ? <p className="studio-assistant-error">当前 AI 服务暂时不可用，请稍后再试。</p> : null}
    <footer className="studio-assistant-composer">
      <textarea aria-label="和鑫小助说" value={input} disabled={!configured || Boolean(selectedObject && !editable)} onChange={(event) => setInput(event.target.value)} onKeyDown={onComposerKeyDown} rows={3} maxLength={4_000} placeholder={selectedObject ? "基于当前内容，你想继续生成什么？" : "说说你想找、整理、创作或检查什么…"} />
      <div><button type="button" aria-label="添加引用" aria-expanded={materialOpen} onClick={() => setMaterialOpen((current) => !current)}><Paperclip size={17} /><span>添加引用</span></button><small>{selectedObject && !editable ? "当前权限只能查看节点记录" : "Enter 发送 · Shift+Enter 换行"}</small><button type="button" className="studio-assistant-stop" disabled={!sending} onClick={() => { abortRef.current?.abort(); setSending(false); }}><Square size={14} />停止</button><Button aria-label="发送给鑫小助" disabled={!input.trim() || sending || !configured || Boolean(selectedObject && !editable)} onClick={() => void send()}><Send size={16} /></Button></div>
    </footer>
    <button type="button" className="studio-assistant-mobile-close" onClick={onClose}>收起鑫小助</button>
  </div>;
});
