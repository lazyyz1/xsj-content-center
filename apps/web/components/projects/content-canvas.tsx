"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  useViewport,
  type Node,
  type NodeProps,
  type Viewport,
} from "@xyflow/react";
import {
  BookOpenCheck,
  FileText,
  Lightbulb,
  Map,
  Maximize2,
  Minus,
  MousePointer2,
  PanelRightOpen,
  PencilLine,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export type CardKind = "brief" | "sources" | "facts" | "methods" | "suggestion" | "draft";
export type CanvasContextKind = Extract<CardKind, "brief" | "sources" | "facts" | "methods">;
export type CanvasAssistantContext = { focus: CardKind | null; openContext: (kind: CanvasContextKind) => void; openDraft: () => void };
type CardData = {
  kind: CardKind;
  title: string;
  lines: string[];
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  onFocus?: () => void;
  onPlatform?: (platform: string) => void;
  draft?: {
    body: string;
    version: number;
    characters: number;
    status: string;
  };
};
type CanvasNode = Node<CardData>;

const icons = {
  brief: Target,
  sources: FileText,
  facts: ShieldCheck,
  methods: BookOpenCheck,
  suggestion: Sparkles,
  draft: PencilLine,
} as const;

const addGroups = [
  { label: "内容", items: [
    { kind: "sources", title: "参考素材", description: "从已有资料中选择" },
    { kind: "facts", title: "我方依据", description: "查看已确认的真实依据" },
  ] },
  { label: "创作", items: [
    { kind: "brief", title: "创作目标", description: "定位并查看唯一目标" },
    { kind: "methods", title: "方法", description: "从当前可用方法中选择" },
    { kind: "draft", title: "当前稿件", description: "打开唯一当前稿件" },
  ] },
  { label: "AI", items: [
    { kind: "suggestion", title: "AI 建议", description: "查看当前已有建议" },
  ] },
] as const;

function PlatformSelect({ onPlatform }: { onPlatform?: (platform: string) => void }) {
  return (
    <select
      className="nodrag nowheel"
      aria-label="适配平台"
      defaultValue=""
      onChange={(event) => {
        if (event.target.value) onPlatform?.(event.target.value);
        event.target.value = "";
      }}
    >
      <option value="">适配平台</option>
      <option value="WECHAT_OFFICIAL">公众号</option>
      <option value="WECHAT_CHANNELS">视频号</option>
      <option value="DOUYIN">抖音</option>
      <option value="XIAOHONGSHU">小红书</option>
      <option value="WECHAT_MOMENTS">朋友圈</option>
    </select>
  );
}

function CanvasCard({ data, selected }: NodeProps<CanvasNode>) {
  const Icon = icons[data.kind];
  const isDraft = data.kind === "draft" && data.draft;

  return (
    <article className={`content-canvas-node is-${data.kind} ${selected ? "is-selected" : ""}`}>
      <header>
        <span aria-hidden="true"><Icon size={17} /></span>
        <div>
          {isDraft ? <small>当前稿件</small> : null}
          <strong>{data.title}</strong>
        </div>
        {data.meta ? <em>{data.meta}</em> : null}
      </header>

      {isDraft ? (
        <>
          <div className="canvas-draft-meta">
            <span>{data.draft?.characters || 0} 字</span>
            <span>{data.draft?.status}</span>
          </div>
          <p className="canvas-draft-preview">
            {data.draft?.body.trim() || "当前还没有稿件内容，从创作目标或素材开始组织第一版吧。"}
          </p>
        </>
      ) : (
        <div className="canvas-card-lines">
          {data.lines.length ? data.lines.slice(0, 5).map((line, index) => <p key={`${index}-${line}`}>{line}</p>) : <p>当前还没有内容。</p>}
        </div>
      )}

      <footer>
        {data.actionLabel ? <button className="nodrag" type="button" onClick={data.onAction}>{data.actionLabel}</button> : null}
        {isDraft ? (
          <>
            <button className="nodrag" data-draft-edit type="button" onClick={data.onFocus}>继续编辑</button>
            <PlatformSelect onPlatform={data.onPlatform} />
          </>
        ) : null}
      </footer>
    </article>
  );
}

const nodeTypes = { card: CanvasCard };

function CanvasToolbar({
  projectTitle,
  saved,
  assistantOpen,
  onAdd,
  onOpenAssistant,
}: {
  projectTitle: string;
  saved: string;
  assistantOpen: boolean;
  onAdd: () => void;
  onOpenAssistant: () => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const motionSafe = typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <header className="canvas-toolbar">
      <div>
        <strong>{projectTitle}</strong>
        <span>{saved}</span>
      </div>
      <nav aria-label="画布操作">
        <button type="button" onClick={() => void zoomOut({ duration: motionSafe ? 160 : 0 })} aria-label="缩小画布"><Minus size={17} /></button>
        <output aria-label="当前缩放比例">{Math.round(zoom * 100)}%</output>
        <button type="button" onClick={() => void fitView({ padding: 0.14, duration: motionSafe ? 240 : 0 })} aria-label="适应视图"><Maximize2 size={17} /></button>
        <button type="button" onClick={() => void zoomIn({ duration: motionSafe ? 160 : 0 })} aria-label="放大画布"><Plus size={17} /></button>
        <i aria-hidden="true" />
        <button type="button" className="canvas-add-button" onClick={onAdd} aria-haspopup="dialog"><Plus size={17} />添加卡片</button>
        {!assistantOpen ? <button type="button" onClick={onOpenAssistant} aria-label="展开鑫小助"><PanelRightOpen size={18} /></button> : null}
      </nav>
    </header>
  );
}

function CanvasChrome({
  addOpen,
  miniMapOpen,
  onAdd,
  onCloseAdd,
  onChoose,
  onSelectMode,
  onToggleMiniMap,
}: {
  addOpen: boolean;
  miniMapOpen: boolean;
  onAdd: () => void;
  onCloseAdd: () => void;
  onChoose: (kind: CardKind) => void;
  onSelectMode: () => void;
  onToggleMiniMap: () => void;
}) {
  const { fitView } = useReactFlow();
  const motionSafe = typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const choose = (kind: CardKind) => {
    onChoose(kind);
    if (kind !== "draft") window.requestAnimationFrame(() => void fitView({ nodes: [{ id: kind }], padding: 0.55, maxZoom: 1.05, duration: motionSafe ? 180 : 0 }));
  };

  return <>
    <nav className="canvas-bottom-toolbar" aria-label="画布工具">
      <button type="button" className="is-primary" onClick={onAdd} aria-expanded={addOpen} aria-haspopup="dialog" title="添加到画布"><Plus size={18} /><span>添加</span></button>
      <button type="button" aria-pressed="true" onClick={onSelectMode} title="选择卡片"><MousePointer2 size={17} /><span>选择</span></button>
      <button type="button" onClick={() => void fitView({ padding: 0.14, duration: motionSafe ? 240 : 0 })} title="适配画布"><Maximize2 size={17} /><span>适配画布</span></button>
      <button type="button" aria-pressed={miniMapOpen} onClick={onToggleMiniMap} title={miniMapOpen ? "隐藏小地图" : "显示小地图"}><Map size={17} /><span>小地图</span></button>
    </nav>

    {addOpen ? <div className="canvas-add-layer">
      <button type="button" tabIndex={-1} aria-label="关闭添加到画布菜单" onClick={onCloseAdd} />
      <aside role="dialog" aria-modal="false" aria-labelledby="canvas-add-title">
        <header><strong id="canvas-add-title">添加到画布</strong><button type="button" aria-label="关闭菜单" onClick={onCloseAdd}><X size={17} /></button></header>
        {addGroups.map((group) => <section key={group.label}><h3>{group.label}</h3><div>{group.items.map((item, index) => { const Icon = icons[item.kind]; return <button type="button" key={item.kind} autoFocus={group.label === "内容" && index === 0} onClick={() => choose(item.kind)}><span aria-hidden="true"><Icon size={17} /></span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>; })}</div></section>)}
      </aside>
    </div> : null}
  </>;
}

type CanvasSurfaceProps = {
  projectId: string;
  projectTitle: string;
  brief: string[];
  sources: string[];
  facts: string[];
  methods: string[];
  suggestions: string[];
  draft: { title: string; body: string; version: number; characters: number; updated: string };
  draftToolbar: ReactNode;
  draftEditor: ReactNode;
  contextTools: ReactNode;
  assistant: ReactNode | ((context: CanvasAssistantContext) => ReactNode);
  assistantOpen: boolean;
  onAssistantOpen: (open: boolean) => void;
  onContextKindChange?: (kind: CanvasContextKind) => void;
  onPlatform: (platform: string) => void;
};

const DEFAULT_VIEWPORT: Viewport = { x: 18, y: 48, zoom: 0.92 };
const MIN_CANVAS_WIDTH = 340;
const MIN_ASSISTANT_WIDTH = 260;
const MAX_ASSISTANT_WIDTH = 520;
const PANE_STORAGE_KEY = "studio-workbench-assistant-width:v1";

function clampAssistantWidth(width: number, totalWidth: number) {
  return Math.round(Math.max(MIN_ASSISTANT_WIDTH, Math.min(width, MAX_ASSISTANT_WIDTH, totalWidth - MIN_CANVAS_WIDTH)));
}

function CanvasSurface({
  projectId,
  projectTitle,
  brief,
  sources,
  facts,
  methods,
  suggestions,
  draft,
  draftToolbar,
  draftEditor,
  contextTools,
  assistant,
  assistantOpen,
  onAssistantOpen,
  onContextKindChange,
  onPlatform,
}: CanvasSurfaceProps) {
  const [focused, setFocused] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [miniMapOpen, setMiniMapOpen] = useState(true);
  const [assistantWidth, setAssistantWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const assistantWidthRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const storageKey = `content-canvas:${projectId}:v5`;

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

  const [viewport, setViewport] = useState<Viewport>(savedLayout.viewport ?? DEFAULT_VIEWPORT);
  const referenceCount = [sources.length > 0, facts.length > 0, methods.length > 0].filter(Boolean).length;

  const templateNodes = useMemo<CanvasNode[]>(() => {
    const positions = savedLayout.nodes ?? {};
    const item = (id: string, position: { x: number; y: number }, data: CardData): CanvasNode => ({ id, type: "card", position: positions[id] ?? position, data });
    const openContext = (kind: CanvasContextKind) => () => { onContextKindChange?.(kind); setContextOpen(true); };
    const openAssistant = () => onAssistantOpen(true);

    return [
      item("brief", { x: 48, y: 42 }, { kind: "brief", title: "创作目标", lines: brief, actionLabel: "查看目标", onAction: openContext("brief") }),
      item("sources", { x: 22, y: 266 }, { kind: "sources", title: "参考素材", lines: sources, meta: `${sources.length} 条`, actionLabel: "管理素材", onAction: openContext("sources") }),
      item("facts", { x: 30, y: 520 }, { kind: "facts", title: "我方依据", lines: facts, meta: `${facts.length} 条`, actionLabel: "核对依据", onAction: openContext("facts") }),
      item("methods", { x: 410, y: 58 }, { kind: "methods", title: "方法", lines: methods, meta: `${methods.length} 个`, actionLabel: "选择方法", onAction: openContext("methods") }),
      item("draft", { x: 350, y: 292 }, {
        kind: "draft",
        title: draft.title || "未命名稿件",
        lines: [],
        onFocus: () => setFocused(true),
        onPlatform,
        draft: { body: draft.body, version: draft.version, characters: draft.characters, status: "已保存" },
      }),
      item("suggestion", { x: 840, y: 326 }, {
        kind: "suggestion",
        title: "AI 建议",
        lines: suggestions.length ? suggestions : ["选中稿件或内容卡片后，我会在这里给你建议。"],
        meta: `${suggestions.length} 条`,
        actionLabel: "打开鑫小助",
        onAction: openAssistant,
      }),
    ];
  }, [brief, draft, facts, methods, onAssistantOpen, onContextKindChange, onPlatform, savedLayout.nodes, sources, suggestions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(templateNodes);
  const selectedNode = nodes.find((node) => node.selected);
  const selectedKind = selectedNode?.data.kind ?? null;
  const currentFocus = focused ? `稿件｜${draft.title || "未命名稿件"}` : selectedNode?.data.title ?? "画布";

  useEffect(() => {
    setNodes((current) => templateNodes.map((next) => {
      const previous = current.find(({ id }) => id === next.id);
      return previous ? { ...next, position: previous.position, selected: previous.selected } : next;
    }));
  }, [setNodes, templateNodes]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      nodes: Object.fromEntries(nodes.map(({ id, position }) => [id, position])),
      viewport,
    }));
  }, [nodes, storageKey, viewport]);

  useEffect(() => {
    const workbench = workbenchRef.current;
    if (!workbench) return;
    const savedWidth = Number(window.localStorage.getItem(PANE_STORAGE_KEY));
    const update = () => {
      const totalWidth = workbench.getBoundingClientRect().width;
      const preferred = assistantWidthRef.current ?? (Number.isFinite(savedWidth) && savedWidth > 0 ? savedWidth : totalWidth * 0.3);
      const nextWidth = clampAssistantWidth(preferred, totalWidth);
      assistantWidthRef.current = nextWidth;
      setAssistantWidth(nextWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(workbench);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!focused) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setFocused(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focused]);

  useEffect(() => {
    if (!addOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setAddOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addOpen]);

  const persistAssistantWidth = useCallback((width: number) => {
    window.localStorage.setItem(PANE_STORAGE_KEY, String(Math.round(width)));
  }, []);

  const resizeAssistant = useCallback((nextWidth: number) => {
    const totalWidth = workbenchRef.current?.getBoundingClientRect().width ?? 1200;
    const clampedWidth = clampAssistantWidth(nextWidth, totalWidth);
    assistantWidthRef.current = clampedWidth;
    setAssistantWidth(clampedWidth);
  }, []);

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!assistantOpen) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startWidth: assistantWidthRef.current ?? 360 };
    setIsResizing(true);
  };

  const handleResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    resizeAssistant(dragRef.current.startWidth + dragRef.current.startX - event.clientX);
  };

  const handleResizeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (assistantWidthRef.current) persistAssistantWidth(assistantWidthRef.current);
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!assistantOpen) return;
    const current = assistantWidthRef.current ?? 360;
    const next = event.key === "ArrowLeft" ? current + 24
      : event.key === "ArrowRight" ? current - 24
        : event.key === "Home" ? MIN_ASSISTANT_WIDTH
          : event.key === "End" ? MAX_ASSISTANT_WIDTH
            : null;
    if (next === null) return;
    event.preventDefault();
    resizeAssistant(next);
    persistAssistantWidth(next);
  };

  const closeFocus = () => {
    setFocused(false);
    window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-draft-edit]")?.focus());
  };

  const openContext = (kind: CanvasContextKind) => { onContextKindChange?.(kind); setContextOpen(true); };

  const chooseCard = (kind: CardKind) => {
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === kind })));
    setAddOpen(false);
    onAssistantOpen(true);
    if (kind === "draft") setFocused(true);
    else if (kind !== "suggestion") openContext(kind);
  };

  const paneStyle = {
    "--assistant-width": assistantOpen ? (assistantWidth ? `${assistantWidth}px` : "30%") : "0px",
  } as CSSProperties;

  return (
    <div ref={workbenchRef} className={`content-workbench ${assistantOpen ? "" : "assistant-closed"} ${isResizing ? "is-resizing" : ""}`} style={paneStyle}>
      <section className="content-canvas" aria-label="内容画布">
        <ReactFlowProvider>
          <CanvasToolbar projectTitle={projectTitle} saved={draft.updated} assistantOpen={assistantOpen} onAdd={() => setAddOpen(true)} onOpenAssistant={() => onAssistantOpen(true)} />
          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={() => onAssistantOpen(true)}
            onPaneClick={(event) => { if (event.detail === 2) setAddOpen(true); }}
            onMoveEnd={(_, next) => setViewport(next)}
            defaultViewport={viewport}
            minZoom={0.72}
            maxZoom={1.8}
            nodesConnectable={false}
            zoomOnDoubleClick={false}
          >
            <Background gap={24} size={1} color="#d9e2ef" />
            {miniMapOpen ? <MiniMap pannable zoomable nodeStrokeWidth={2} ariaLabel="画布小地图" /> : null}
          </ReactFlow>
          <CanvasChrome addOpen={addOpen} miniMapOpen={miniMapOpen} onAdd={() => setAddOpen(true)} onCloseAdd={() => setAddOpen(false)} onChoose={chooseCard} onSelectMode={() => { setAddOpen(false); setNodes((current) => current.map((node) => ({ ...node, selected: false }))); }} onToggleMiniMap={() => setMiniMapOpen((current) => !current)} />
        </ReactFlowProvider>

        {focused ? (
          <div className="draft-focus-layer" role="dialog" aria-modal="false" aria-label={`编辑稿件 ${draft.title || "未命名稿件"}`}>
            <section>
              <header>
                <button type="button" autoFocus onClick={closeFocus}><X size={17} />返回画布</button>
                <div><strong>{draft.title || "未命名稿件"}</strong><span>{draft.updated}</span></div>
                <div className="draft-focus-actions">{draftToolbar}<PlatformSelect onPlatform={onPlatform} /></div>
              </header>
              <div className="draft-focus-editor">{draftEditor}</div>
            </section>
          </div>
        ) : null}
      </section>

      <div
        className="workbench-pane-divider"
        role="separator"
        aria-label="调整鑫小助宽度"
        aria-orientation="vertical"
        aria-valuemin={MIN_ASSISTANT_WIDTH}
        aria-valuemax={MAX_ASSISTANT_WIDTH}
        aria-valuenow={assistantWidth ?? 360}
        tabIndex={assistantOpen ? 0 : -1}
        onKeyDown={handleResizeKeyDown}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      ><span /></div>

      <aside className="workbench-assistant" aria-hidden={!assistantOpen} inert={!assistantOpen}>
        <header>
          <div className="workbench-assistant-title">
            <span aria-hidden="true"><Lightbulb size={18} /></span>
            <strong>鑫小助</strong>
            <i>在线</i>
            <button type="button" aria-label="收起鑫小助" onClick={() => onAssistantOpen(false)}><X size={18} /></button>
          </div>
          <div className="workbench-assistant-context">
            <span title={projectTitle}>当前项目 · {projectTitle}</span>
            <span title={currentFocus}>当前焦点 · {currentFocus}</span>
            <span>引用 · {referenceCount}</span>
          </div>
        </header>
        <div className="workbench-assistant-body">{typeof assistant === "function" ? assistant({ focus: focused ? "draft" : selectedKind, openContext, openDraft: () => setFocused(true) }) : assistant}</div>
        <div className="workbench-assistant-composer-preview">
          <p>自由对话将在后续接入</p>
          <small>现在可以使用上方与当前项目关联的快捷操作。</small>
        </div>
      </aside>

      {contextOpen ? (
        <div className="canvas-tools-layer">
          <button type="button" aria-label="关闭当前创作内容" onClick={() => setContextOpen(false)} />
          <aside>
            <header><strong>当前创作内容</strong><button type="button" aria-label="关闭当前创作内容" onClick={() => setContextOpen(false)}><X size={18} /></button></header>
            {contextTools}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export function ContentCanvas(props: CanvasSurfaceProps) {
  return <CanvasSurface {...props} />;
}
