"use client";

import "@xyflow/react/dist/style.css";
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, type Edge, type Node, type NodeProps, type Viewport } from "@xyflow/react";
import { BookOpenCheck, FileText, Lightbulb, PencilLine, Plus, ShieldCheck, Target, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type CardData = { kind: "brief" | "sources" | "facts" | "methods" | "draft"; title: string; lines: string[]; meta?: string; onFocus?: () => void; onReference?: () => void; onPlatform?: (platform: string) => void };
type CanvasNode = Node<CardData>;
const icons = { brief: Target, sources: FileText, facts: ShieldCheck, methods: BookOpenCheck, draft: PencilLine } as const;

function CanvasCard({ data, selected }: NodeProps<CanvasNode>) {
  const Icon = icons[data.kind];
  return <article className={`content-canvas-node is-${data.kind} ${selected ? "is-selected" : ""}`}><Handle type="target" position={Position.Left} /><header><span><Icon size={17} /></span><strong>{data.title}</strong></header><div>{data.lines.length ? data.lines.slice(0, 4).map((line) => <p key={line}>{line}</p>) : <p>当前还没有内容。</p>}</div>{data.meta ? <small>{data.meta}</small> : null}<footer>{data.onReference && data.kind !== "draft" ? <button type="button" onClick={data.onReference}>作为当前引用</button> : null}{data.kind === "draft" ? <><button type="button" onClick={data.onFocus}>继续编辑</button><select aria-label="适配平台" defaultValue="" onChange={(event) => { if (event.target.value) data.onPlatform?.(event.target.value); event.target.value = ""; }}><option value="">适配平台</option><option value="WECHAT_CHANNELS">视频号</option><option value="DOUYIN">抖音</option><option value="XIAOHONGSHU">小红书</option><option value="WECHAT_MOMENTS">朋友圈</option></select></> : null}</footer><Handle type="source" position={Position.Right} /></article>;
}
const nodeTypes = { card: CanvasCard };

function CanvasSurface({ projectId, projectTitle, brief, sources, facts, methods, draft, draftEditor, contextTools, assistant, assistantOpen, onAssistantOpen, onPlatform }: { projectId: string; projectTitle: string; brief: string[]; sources: string[]; facts: string[]; methods: string[]; draft: { title: string; version: number; characters: number; updated: string }; draftEditor: ReactNode; contextTools: ReactNode; assistant: ReactNode; assistantOpen: boolean; onAssistantOpen: (open: boolean) => void; onPlatform: (platform: string) => void }) {
  const [focused, setFocused] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [references, setReferences] = useState<string[]>([]);
  const storageKey = `content-canvas:${projectId}:v1`;
  const savedLayout = useMemo(() => {
    if (typeof window === "undefined") return { nodes: {} as Record<string, { x: number; y: number }>, viewport: undefined as Viewport | undefined };
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as {
        nodes?: Record<string, { x: number; y: number }>;
        viewport?: Viewport;
      };
    } catch {
      return { nodes: {} as Record<string, { x: number; y: number }>, viewport: undefined as Viewport | undefined };
    }
  }, [storageKey]);
  const initial = useMemo<CanvasNode[]>(() => {
    const positions = savedLayout.nodes ?? {};
    const item = (id: string, position: { x: number; y: number }, data: CardData): CanvasNode => ({ id, type: "card", position: positions[id] ?? position, data });
    const addRef = (label: string) => setReferences((current) => current.includes(label) ? current : [...current, label]);
    return [item("brief", { x: 410, y: 40 }, { kind: "brief", title: "创作目标", lines: brief }), item("sources", { x: 40, y: 170 }, { kind: "sources", title: "参考素材", lines: sources, meta: `${sources.length} 条`, onReference: () => addRef("参考素材") }), item("facts", { x: 80, y: 460 }, { kind: "facts", title: "我方依据", lines: facts, meta: `${facts.length} 条`, onReference: () => addRef("我方依据") }), item("methods", { x: 760, y: 110 }, { kind: "methods", title: "方法", lines: methods, meta: `${methods.length} 个`, onReference: () => addRef("方法") }), item("draft", { x: 430, y: 310 }, { kind: "draft", title: draft.title || "当前稿件", lines: [`V${draft.version || 0} · ${draft.characters} 字`, draft.updated], onFocus: () => setFocused(true), onPlatform })];
  }, [brief, draft, facts, methods, onPlatform, savedLayout.nodes, sources]);
  const initialEdges = useMemo<Edge[]>(() => [{ id: "brief-draft", source: "brief", target: "draft", label: "明确方向" }, { id: "sources-draft", source: "sources", target: "draft", label: "参考" }, { id: "facts-draft", source: "facts", target: "draft", label: "支撑" }, { id: "methods-draft", source: "methods", target: "draft", label: "应用方法" }], []);
  const [nodes, , onNodesChange] = useNodesState(initial);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [viewport, setViewport] = useState<Viewport>(savedLayout.viewport ?? { x: 0, y: 0, zoom: 1 });
  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify({ nodes: Object.fromEntries(nodes.map(({ id, position }) => [id, position])), viewport })); }, [nodes, storageKey, viewport]);
  return <div className={`content-workbench ${assistantOpen ? "" : "assistant-closed"}`}><section className="content-canvas"><ReactFlowProvider><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onMoveEnd={(_, next) => setViewport(next)} defaultViewport={viewport} fitView={!savedLayout.viewport} minZoom={0.35} maxZoom={1.8}><Background gap={18} size={1} /><Controls showInteractive={false} /><MiniMap pannable zoomable nodeStrokeWidth={3} /></ReactFlow></ReactFlowProvider><button type="button" className="canvas-add-card" onClick={() => setToolsOpen(true)}><Plus size={17} />添加卡片</button></section>{assistantOpen ? <aside className="workbench-assistant"><header><div><small>当前项目</small><strong>{projectTitle}</strong></div><div><small>当前焦点</small><strong>{focused ? `稿件｜${draft.title}` : "画布"}</strong></div><div><small>当前引用</small><p>{references.length ? references.join("、") : "还没有显式引用"}</p></div></header>{assistant}</aside> : <button type="button" className="workbench-assistant-open" onClick={() => onAssistantOpen(true)}><Lightbulb size={18} />鑫小助</button>}{toolsOpen ? <div className="canvas-tools-layer"><button type="button" aria-label="关闭添加卡片" onClick={() => setToolsOpen(false)} /><aside><header><strong>添加到当前工作</strong><button type="button" onClick={() => setToolsOpen(false)}><X size={18} /></button></header>{contextTools}</aside></div> : null}{focused ? <div className="draft-focus-layer"><button type="button" aria-label="返回画布" onClick={() => setFocused(false)} /><section><header><div><span>稿件 · 编辑中</span><strong>{draft.title}</strong></div><button type="button" aria-label="关闭专注编辑" onClick={() => setFocused(false)}><X size={19} /></button></header>{draftEditor}</section></div> : null}</div>;
}

export function ContentCanvas(props: Parameters<typeof CanvasSurface>[0]) { return <CanvasSurface {...props} />; }
