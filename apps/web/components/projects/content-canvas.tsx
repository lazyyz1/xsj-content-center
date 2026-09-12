"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
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
  Columns3,
  FileText,
  Grid2X2,
  Hand,
  LayoutGrid,
  Lightbulb,
  Map,
  Maximize2,
  Minus,
  MousePointer2,
  PanelRightOpen,
  PencilLine,
  Plus,
  Rows3,
  Settings2,
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
export type WorkbenchLayoutMode = "canvas-only" | "canvas-assistant" | "assistant-only";
type CanvasTool = "select" | "pan";
type ArrangeMode = "type" | "grid" | "horizontal" | "vertical";
type CanvasBackgroundStyle = "dots" | "grid" | "solid";
type CanvasBackgroundTone = "default" | "warm" | "cool";
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

const ARRANGE_POSITIONS: Record<ArrangeMode, Record<CardKind, { x: number; y: number }>> = {
  type: {
    brief: { x: 48, y: 42 }, sources: { x: 22, y: 266 }, facts: { x: 30, y: 520 },
    methods: { x: 410, y: 58 }, draft: { x: 350, y: 292 }, suggestion: { x: 840, y: 326 },
  },
  grid: {
    brief: { x: 24, y: 48 }, sources: { x: 400, y: 48 }, facts: { x: 732, y: 48 },
    methods: { x: 24, y: 330 }, draft: { x: 356, y: 330 }, suggestion: { x: 868, y: 330 },
  },
  horizontal: {
    brief: { x: 20, y: 250 }, sources: { x: 396, y: 250 }, facts: { x: 728, y: 250 },
    methods: { x: 1060, y: 250 }, draft: { x: 1392, y: 250 }, suggestion: { x: 1904, y: 250 },
  },
  vertical: {
    brief: { x: 380, y: 20 }, sources: { x: 402, y: 270 }, facts: { x: 402, y: 469 },
    methods: { x: 402, y: 668 }, draft: { x: 312, y: 867 }, suggestion: { x: 418, y: 1203 },
  },
};

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
  menu,
  miniMapOpen,
  onMenu,
  onToggleMiniMap,
  onToggleLayout,
}: {
  projectTitle: string;
  saved: string;
  menu: "arrange" | "settings" | null;
  miniMapOpen: boolean;
  onMenu: (menu: "arrange" | "settings") => void;
  onToggleMiniMap: () => void;
  onToggleLayout: () => void;
}) {
  const { zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();
  const motionSafe = typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <header className="canvas-toolbar">
      <div>
        <strong>{projectTitle}</strong>
        <span>{saved}</span>
      </div>
      <nav aria-label="画布操作">
        <button type="button" title="整理画布" aria-expanded={menu === "arrange"} onClick={() => onMenu("arrange")} aria-label="整理画布"><LayoutGrid size={17} /></button>
        <i aria-hidden="true" />
        <button type="button" title="缩小画布" onClick={() => void zoomOut({ duration: motionSafe ? 160 : 0 })} aria-label="缩小画布"><Minus size={17} /></button>
        <output aria-label="当前缩放比例">{Math.round(zoom * 100)}%</output>
        <button type="button" title="放大画布" onClick={() => void zoomIn({ duration: motionSafe ? 160 : 0 })} aria-label="放大画布"><Plus size={17} /></button>
        <i aria-hidden="true" />
        <button type="button" title="画布设置" aria-expanded={menu === "settings"} onClick={() => onMenu("settings")} aria-label="画布设置"><Settings2 size={17} /></button>
        <button type="button" title={miniMapOpen ? "隐藏小地图" : "显示小地图"} aria-pressed={miniMapOpen} onClick={onToggleMiniMap} aria-label={miniMapOpen ? "隐藏小地图" : "显示小地图"}><Map size={17} /></button>
        <button type="button" title="切换工作区布局" onClick={onToggleLayout} aria-label="切换工作区布局"><PanelRightOpen size={18} /></button>
      </nav>
    </header>
  );
}

function CanvasViewMenu({
  menu,
  nodes,
  backgroundStyle,
  backgroundTone,
  onClose,
  onNodes,
  onBackgroundStyle,
  onBackgroundTone,
}: {
  menu: "arrange" | "settings" | null;
  nodes: CanvasNode[];
  backgroundStyle: CanvasBackgroundStyle;
  backgroundTone: CanvasBackgroundTone;
  onClose: () => void;
  onNodes: (nodes: CanvasNode[]) => void;
  onBackgroundStyle: (style: CanvasBackgroundStyle) => void;
  onBackgroundTone: (tone: CanvasBackgroundTone) => void;
}) {
  const { fitView } = useReactFlow();
  const motionSafe = typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const arrange = (mode: ArrangeMode) => {
    const positions = ARRANGE_POSITIONS[mode];
    onNodes(nodes.map((node) => ({ ...node, position: positions[node.data.kind] })));
    window.requestAnimationFrame(() => void fitView({ padding: 0.16, maxZoom: 1.05, duration: motionSafe ? 260 : 0 }));
    onClose();
  };

  if (!menu) return null;
  return <div className="canvas-view-menu-layer">
    <button type="button" tabIndex={-1} aria-label="关闭画布菜单" onClick={onClose} />
    <aside className={`canvas-view-menu is-${menu}`} aria-label={menu === "arrange" ? "整理画布" : "画布设置"}>
      {menu === "arrange" ? <>
        <h3>整理画布</h3>
        <div className="canvas-arrange-options">
          <button type="button" onClick={() => arrange("type")}><LayoutGrid size={16} /><span><strong>按内容类型</strong><small>恢复推荐结构</small></span></button>
          <button type="button" onClick={() => arrange("grid")}><Grid2X2 size={16} /><span><strong>网格排列</strong><small>整齐分布卡片</small></span></button>
          <button type="button" onClick={() => arrange("horizontal")}><Columns3 size={16} /><span><strong>水平排列</strong><small>从左向右展开</small></span></button>
          <button type="button" onClick={() => arrange("vertical")}><Rows3 size={16} /><span><strong>垂直排列</strong><small>从上向下展开</small></span></button>
        </div>
        <button type="button" className="canvas-fit-action" onClick={() => { void fitView({ padding: 0.14, duration: motionSafe ? 240 : 0 }); onClose(); }}><Maximize2 size={16} />适配画布</button>
      </> : <>
        <fieldset><legend>背景</legend><div>{(["dots", "grid", "solid"] as const).map((style) => <button key={style} type="button" aria-pressed={backgroundStyle === style} onClick={() => onBackgroundStyle(style)}>{style === "dots" ? "点阵" : style === "grid" ? "网格" : "纯色"}</button>)}</div></fieldset>
        <fieldset><legend>色调</legend><div>{(["default", "warm", "cool"] as const).map((tone) => <button key={tone} type="button" aria-pressed={backgroundTone === tone} onClick={() => onBackgroundTone(tone)}><i className={`canvas-tone-swatch is-${tone}`} />{tone === "default" ? "默认" : tone === "warm" ? "暖灰" : "冷灰"}</button>)}</div></fieldset>
      </>}
    </aside>
  </div>;
}

function WorkbenchLayoutMenu({ current, open, onClose, onChange }: { current: WorkbenchLayoutMode; open: boolean; onClose: () => void; onChange: (mode: WorkbenchLayoutMode) => void }) {
  if (!open) return null;
  const options: Array<{ mode: WorkbenchLayoutMode; label: string; description: string }> = [
    { mode: "canvas-only", label: "仅画布", description: "专注整理与编辑内容" },
    { mode: "canvas-assistant", label: "画布 + 鑫小助", description: "边创作边获得协作建议" },
    { mode: "assistant-only", label: "仅鑫小助", description: "集中查看建议与快捷操作" },
  ];
  return <div className="workbench-layout-layer">
    <button type="button" tabIndex={-1} aria-label="关闭布局菜单" onClick={onClose} />
    <aside aria-label="工作区布局"><h3>工作区布局</h3>{options.map((option) => <button key={option.mode} type="button" aria-pressed={current === option.mode} onClick={() => { onChange(option.mode); onClose(); }}><span><strong>{option.label}</strong><small>{option.description}</small></span>{current === option.mode ? <i>当前</i> : null}</button>)}</aside>
  </div>;
}

function CanvasChrome({
  addOpen,
  activeTool,
  onAdd,
  onCloseAdd,
  onChoose,
  onTool,
}: {
  addOpen: boolean;
  activeTool: CanvasTool;
  onAdd: () => void;
  onCloseAdd: () => void;
  onChoose: (kind: CardKind) => void;
  onTool: (tool: CanvasTool) => void;
}) {
  const choose = (kind: CardKind) => {
    onChoose(kind);
  };

  return <>
    <nav className="canvas-bottom-toolbar" aria-label="画布工具">
      <button type="button" className="is-primary" onClick={onAdd} aria-expanded={addOpen} aria-haspopup="dialog" title="添加到画布"><Plus size={18} /><span>添加</span></button>
      <button type="button" aria-pressed={activeTool === "select"} onClick={() => onTool("select")} title="选择卡片"><MousePointer2 size={17} /><span>选择</span></button>
      <button type="button" aria-pressed={activeTool === "pan"} onClick={() => onTool("pan")} title="拖动画布"><Hand size={17} /><span>移动</span></button>
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
  layoutMode: WorkbenchLayoutMode;
  onLayoutModeChange: (mode: WorkbenchLayoutMode) => void;
  onAssistantOpen: (open: boolean) => void;
  onContextKindChange?: (kind: CanvasContextKind) => void;
  onPlatform: (platform: string) => void;
};

const DEFAULT_VIEWPORT: Viewport = { x: 18, y: 48, zoom: 0.92 };
const MIN_CANVAS_WIDTH = 340;
const MIN_ASSISTANT_WIDTH = 260;
const MAX_ASSISTANT_WIDTH = 520;
const LEGACY_PANE_STORAGE_KEY = "studio-workbench-assistant-width:v1";

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
  layoutMode,
  onLayoutModeChange,
  onAssistantOpen,
  onContextKindChange,
  onPlatform,
}: CanvasSurfaceProps) {
  const [focused, setFocused] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [canvasMenu, setCanvasMenu] = useState<"arrange" | "settings" | null>(null);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [miniMapOpen, setMiniMapOpen] = useState(true);
  const [toolMode, setToolMode] = useState<CanvasTool>("select");
  const [spacePanning, setSpacePanning] = useState(false);
  const [backgroundStyle, setBackgroundStyle] = useState<CanvasBackgroundStyle>("dots");
  const [backgroundTone, setBackgroundTone] = useState<CanvasBackgroundTone>("default");
  const [assistantWidth, setAssistantWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const assistantWidthRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const viewReadyRef = useRef(false);
  const viewProjectRef = useRef(projectId);
  const storageKey = `content-canvas:${projectId}:v5`;
  const viewStorageKey = `content-canvas:${projectId}:view:v1`;
  const paneStorageKey = `studio-workbench-assistant-width:${projectId}:v1`;

  if (viewProjectRef.current !== projectId) {
    viewProjectRef.current = projectId;
    viewReadyRef.current = false;
  }

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
  const activeTool: CanvasTool = spacePanning ? "pan" : toolMode;
  const referenceCount = [sources.length > 0, facts.length > 0, methods.length > 0].filter(Boolean).length;

  const templateNodes = useMemo<CanvasNode[]>(() => {
    const positions = savedLayout.nodes ?? {};
    const item = (id: string, position: { x: number; y: number }, data: CardData): CanvasNode => ({ id, type: "card", position: positions[id] ?? position, data });
    const openContext = (kind: CanvasContextKind) => () => { onContextKindChange?.(kind); setContextOpen(true); };
    const openAssistant = () => onLayoutModeChange("canvas-assistant");

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
  }, [brief, draft, facts, methods, onContextKindChange, onLayoutModeChange, onPlatform, savedLayout.nodes, sources, suggestions]);

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
    viewReadyRef.current = false;
    try {
      const stored = JSON.parse(window.localStorage.getItem(viewStorageKey) ?? "{}") as Record<string, unknown>;
      if (typeof stored.miniMapOpen === "boolean") setMiniMapOpen(stored.miniMapOpen);
      if (stored.toolMode === "select" || stored.toolMode === "pan") setToolMode(stored.toolMode);
      if (stored.backgroundStyle === "dots" || stored.backgroundStyle === "grid" || stored.backgroundStyle === "solid") setBackgroundStyle(stored.backgroundStyle);
      if (stored.backgroundTone === "default" || stored.backgroundTone === "warm" || stored.backgroundTone === "cool") setBackgroundTone(stored.backgroundTone);
    } catch {
      // Ignore invalid local preferences and keep the stable defaults.
    }
    const frame = window.requestAnimationFrame(() => { viewReadyRef.current = true; });
    return () => window.cancelAnimationFrame(frame);
  }, [viewStorageKey]);

  useEffect(() => {
    if (!viewReadyRef.current) return;
    window.localStorage.setItem(viewStorageKey, JSON.stringify({ miniMapOpen, toolMode, backgroundStyle, backgroundTone }));
  }, [backgroundStyle, backgroundTone, miniMapOpen, toolMode, viewStorageKey]);

  useEffect(() => {
    const workbench = workbenchRef.current;
    if (!workbench) return;
    const savedWidth = Number(window.localStorage.getItem(paneStorageKey) ?? window.localStorage.getItem(LEGACY_PANE_STORAGE_KEY));
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
  }, [paneStorageKey]);

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

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target : null;
      return Boolean(element?.closest("input, textarea, select, [contenteditable='true']"));
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setCanvasMenu(null);
        setLayoutMenuOpen(false);
        return;
      }
      if (event.code !== "Space" || event.repeat || isEditableTarget(event.target)) return;
      event.preventDefault();
      setSpacePanning(true);
    };
    const onKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.code === "Space") setSpacePanning(false);
    };
    const onBlur = () => setSpacePanning(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const persistAssistantWidth = useCallback((width: number) => {
    window.localStorage.setItem(paneStorageKey, String(Math.round(width)));
  }, [paneStorageKey]);

  const resizeAssistant = useCallback((nextWidth: number) => {
    const totalWidth = workbenchRef.current?.getBoundingClientRect().width ?? 1200;
    const clampedWidth = clampAssistantWidth(nextWidth, totalWidth);
    assistantWidthRef.current = clampedWidth;
    setAssistantWidth(clampedWidth);
  }, []);

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (layoutMode !== "canvas-assistant") return;
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
    if (layoutMode !== "canvas-assistant") return;
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
    if (kind === "draft") setFocused(true);
    else if (kind === "suggestion") onLayoutModeChange("canvas-assistant");
    else openContext(kind);
  };

  const paneStyle = {
    "--assistant-width": layoutMode === "canvas-assistant" ? (assistantWidth ? `${assistantWidth}px` : "30%") : "0px",
  } as CSSProperties;
  const backgroundColor = backgroundTone === "warm" ? "#ddcdb9" : backgroundTone === "cool" ? "#c8d9ee" : "#d9e2ef";

  return (
    <div ref={workbenchRef} className={`content-workbench is-${layoutMode} tool-${activeTool} ${isResizing ? "is-resizing" : ""}`} data-layout={layoutMode} style={paneStyle}>
      <section className="content-canvas" data-background-style={backgroundStyle} data-background-tone={backgroundTone} aria-label="内容画布" aria-hidden={layoutMode === "assistant-only"}>
        <ReactFlowProvider>
          <CanvasToolbar
            projectTitle={projectTitle}
            saved={draft.updated}
            menu={canvasMenu}
            miniMapOpen={miniMapOpen}
            onMenu={(menu) => { setCanvasMenu((current) => current === menu ? null : menu); setLayoutMenuOpen(false); }}
            onToggleMiniMap={() => setMiniMapOpen((current) => !current)}
            onToggleLayout={() => { setLayoutMenuOpen((current) => !current); setCanvasMenu(null); }}
          />
          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onPaneClick={(event) => { if (event.detail === 2) setAddOpen(true); }}
            onMoveEnd={(_, next) => setViewport(next)}
            defaultViewport={viewport}
            minZoom={0.72}
            maxZoom={1.8}
            nodesDraggable={activeTool === "select"}
            elementsSelectable={activeTool === "select"}
            panOnDrag={activeTool === "pan" ? true : [1, 2]}
            selectionOnDrag={false}
            nodesConnectable={false}
            zoomOnDoubleClick={false}
          >
            {backgroundStyle !== "solid" ? <Background variant={backgroundStyle === "grid" ? BackgroundVariant.Lines : BackgroundVariant.Dots} gap={backgroundStyle === "grid" ? 28 : 24} size={backgroundStyle === "grid" ? 0.7 : 1} color={backgroundColor} /> : null}
            {miniMapOpen ? <MiniMap pannable zoomable nodeStrokeWidth={2} ariaLabel="画布小地图" /> : null}
          </ReactFlow>
          <CanvasViewMenu menu={canvasMenu} nodes={nodes} backgroundStyle={backgroundStyle} backgroundTone={backgroundTone} onClose={() => setCanvasMenu(null)} onNodes={setNodes} onBackgroundStyle={setBackgroundStyle} onBackgroundTone={setBackgroundTone} />
          <CanvasChrome addOpen={addOpen} activeTool={activeTool} onAdd={() => setAddOpen(true)} onCloseAdd={() => setAddOpen(false)} onChoose={chooseCard} onTool={(tool) => { setToolMode(tool); setAddOpen(false); if (tool === "select") setNodes((current) => current.map((node) => ({ ...node, selected: false }))); }} />
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
        tabIndex={layoutMode === "canvas-assistant" ? 0 : -1}
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
            {layoutMode === "assistant-only" ? <button type="button" title="切换工作区布局" aria-label="切换工作区布局" onClick={() => setLayoutMenuOpen((current) => !current)}><LayoutGrid size={17} /></button> : null}
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

      <WorkbenchLayoutMenu current={layoutMode} open={layoutMenuOpen} onClose={() => setLayoutMenuOpen(false)} onChange={onLayoutModeChange} />

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
