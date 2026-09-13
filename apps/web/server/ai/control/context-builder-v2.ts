import "server-only";

import { createHash } from "node:crypto";
import { db } from "@content-center/db";
import { ProjectContextBuilder } from "../project-context";
import type { AIControlTask, ContextItem, ContextManifest, ContextOwnership, SelectedContextObject } from "./contracts";

type BuildInput = {
  workspaceId: string;
  userId: string;
  projectId: string;
  taskType: AIControlTask;
  action: Parameters<ProjectContextBuilder["build"]>[0]["action"];
  studioAction?: Parameters<ProjectContextBuilder["build"]>[0]["studioAction"];
  selectedObjects?: SelectedContextObject[];
};

type ProjectContextRecord = {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  audience: string | null;
  updatedAt: Date;
  creatorProfile: { id: string; updatedAt: Date } | null;
  primaryDraftBranch: DraftContextRecord | null;
  draftBranches: DraftContextRecord[];
};

type DraftContextRecord = {
  id: string;
  workingTitle: string;
  workingBody: string;
  workingOutline: unknown;
  currentRevisionId: string | null;
  version: number;
  updatedAt: Date;
};

export interface SelectedContextObjectAdapter {
  resolve(input: { workspaceId: string; projectId: string; selectedObjects: SelectedContextObject[] }): Promise<ContextItem[]>;
}

class CanvasSelectedObjectAdapter implements SelectedContextObjectAdapter {
  async resolve(input: { workspaceId: string; projectId: string; selectedObjects: SelectedContextObject[] }) {
    const requested = input.selectedObjects.filter((item) => item.objectType === "CANVAS_OBJECT");
    if (!requested.length) return [];
    const rows = await db.canvasObject.findMany({
      where: { id: { in: requested.map(({ objectId }) => objectId) }, workspaceId: input.workspaceId, projectId: input.projectId, deletedAt: null },
      select: { id: true, objectType: true, title: true, textContent: true, contentVersion: true },
    });
    return rows.map((row): ContextItem => {
      const requestedItem = requested.find(({ objectId }) => objectId === row.id);
      return {
        objectType: "CANVAS_OBJECT",
        objectId: row.id,
        version: row.contentVersion,
        ownership: requestedItem?.ownership ?? "PENDING",
        provenance: `canvas:${row.objectType}`,
        whySelected: requestedItem?.whySelected ?? "用户当前选中对象",
        truncated: false,
        content: [row.title, row.textContent].filter(Boolean).join("\n"),
      };
    });
  }
}

type ContextBuilderStore = {
  loadProject(input: { workspaceId: string; userId: string; projectId: string }): Promise<ProjectContextRecord | null>;
};

const defaultStore: ContextBuilderStore = {
  loadProject: (input) => db.contentProject.findFirst({
    where: { id: input.projectId, workspaceId: input.workspaceId, workspace: { members: { some: { userId: input.userId } } } },
    select: {
      id: true,
      title: true,
      description: true,
      goal: true,
      audience: true,
      updatedAt: true,
      creatorProfile: { select: { id: true, updatedAt: true } },
      primaryDraftBranch: { select: { id: true, workingTitle: true, workingBody: true, workingOutline: true, currentRevisionId: true, version: true, updatedAt: true } },
      draftBranches: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { id: true, workingTitle: true, workingBody: true, workingOutline: true, currentRevisionId: true, version: true, updatedAt: true } },
    },
  }),
};

const budgets = { project: 4_000, draft: 16_000, selected: 8_000, profile: 4_000, method: 6_000, fact: 8_000, source: 12_000 } as const;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

function bounded(content: string, maximum: number) {
  return content.length <= maximum ? { content, truncated: false } : { content: content.slice(0, maximum), truncated: true };
}

function item(input: Omit<ContextItem, "content" | "truncated"> & { content: string }, maximum: number): ContextItem {
  return { ...input, ...bounded(input.content, maximum) };
}

function boundedItems(entries: Array<Omit<ContextItem, "truncated">>, maximum: number) {
  let remaining = maximum;
  return entries.map((entry): ContextItem => {
    const selected = bounded(entry.content, Math.max(0, remaining));
    remaining -= selected.content.length;
    return { ...entry, ...selected, truncated: selected.truncated || remaining === 0 && entry.content.length > selected.content.length };
  });
}

function sourceRows(context: unknown): Array<Record<string, unknown>> {
  const external = record(record(context).externalReferences);
  return [
    ...array(external.materials).map((value) => ({ ...record(value), contextKind: "material" })),
    ...array(external.evidence).map((value) => ({ ...record(value), id: record(value).sourceItemId ?? record(value).id, contextKind: "evidence" })),
    ...array(external.additional).map((value) => ({ ...record(value), contextKind: "additional" })),
  ];
}

export class ContextBuilderV2 {
  constructor(
    private readonly legacyBuilder: Pick<ProjectContextBuilder, "build"> = new ProjectContextBuilder(),
    private readonly store: ContextBuilderStore = defaultStore,
    private readonly selectedObjectAdapter: SelectedContextObjectAdapter = new CanvasSelectedObjectAdapter(),
  ) {}

  async build(input: BuildInput) {
    const [project, legacy] = await Promise.all([
      this.store.loadProject(input),
      this.legacyBuilder.build({ workspaceId: input.workspaceId, userId: input.userId, projectId: input.projectId, action: input.action, studioAction: input.studioAction }),
    ]);
    if (!project) return null;

    const selected = await this.selectedObjectAdapter.resolve({ workspaceId: input.workspaceId, projectId: input.projectId, selectedObjects: input.selectedObjects ?? [] });
    const draft = project.primaryDraftBranch ?? project.draftBranches[0] ?? null;
    const selectedItems = boundedItems(selected, budgets.selected);
    const projectItem = item({ objectType: "PROJECT", objectId: project.id, version: project.updatedAt.toISOString(), ownership: "OWN_CONFIRMED", provenance: "project", whySelected: "当前项目目标", content: JSON.stringify({ title: project.title, description: project.description, goal: project.goal, audience: project.audience }) }, budgets.project);
    const draftItem = draft ? item({ objectType: "DRAFT_WORKING_STATE", objectId: draft.id, version: draft.version, ownership: "OWN_CONFIRMED", provenance: "draft_branch_working_state", whySelected: "当前主稿 working state", content: JSON.stringify({ title: draft.workingTitle, body: draft.workingBody, outline: draft.workingOutline }) }, budgets.draft) : null;
    const profile = record(record(legacy.context).creatorProfile);
    const profileItem = project.creatorProfile ? item({ objectType: "CREATOR_PROFILE", objectId: project.creatorProfile.id, version: project.creatorProfile.updatedAt.toISOString(), ownership: "PENDING", provenance: "creator_profile", whySelected: "项目绑定的人物画像", content: JSON.stringify(profile) }, budgets.profile) : null;
    const methodItems = boundedItems([
      ...(legacy.defaultMethod ? [{ objectType: "DEFAULT_METHOD_VERSION", objectId: legacy.defaultMethod.versionId, version: legacy.defaultMethod.version, ownership: "METHOD_GUIDANCE" as ContextOwnership, provenance: "workspace_default_method", whySelected: "当前任务对应的默认创作方式", content: JSON.stringify(legacy.defaultMethod.sections) }] : []),
      ...legacy.selectedMethods.map((method) => ({ objectType: "METHOD_VERSION", objectId: method.methodVersionId, version: method.version, ownership: "METHOD_GUIDANCE" as ContextOwnership, provenance: "project_method_selection", whySelected: "项目已选择的创作方法", content: JSON.stringify({ title: method.title, steps: method.steps, applicableScenarios: method.applicableScenarios, boundaries: method.boundaries }) })),
    ], budgets.method);
    const factItems = boundedItems(legacy.ownFacts.map((fact) => ({ objectType: "CONFIRMED_INFORMATION", objectId: fact.sourceId ?? `${fact.source}:${fact.text.slice(0, 40)}`, version: null, ownership: "OWN_CONFIRMED" as ContextOwnership, provenance: fact.source, whySelected: "已确认我方信息", content: fact.text })), budgets.fact);
    const sources = boundedItems(sourceRows(legacy.context).map((source) => ({ objectType: "SOURCE_ITEM", objectId: String(source.id ?? "unknown"), version: Number(record(source.materialDistillation).version ?? record(source.materialAnalysis).version ?? 0) || null, ownership: "EXTERNAL" as ContextOwnership, provenance: String(source.platform ?? source.contextKind ?? "external_source"), whySelected: "相关项目资料摘要", content: JSON.stringify({ title: source.title, content: source.content, materialDistillation: source.materialDistillation, materialUnderstanding: source.materialUnderstanding, materialAnalysis: source.materialAnalysis }) })), budgets.source);
    const items = [projectItem, ...(draftItem ? [draftItem] : []), ...selectedItems, ...(profileItem ? [profileItem] : []), ...methodItems, ...factItems, ...sources];
    const categories = Object.fromEntries(items.map((entry) => [entry.objectType, items.filter((candidate) => candidate.objectType === entry.objectType).some((candidate) => candidate.truncated)]));

    const manifestCore = {
      schemaVersion: "ai-context-manifest-v1" as const,
      generatedAt: new Date().toISOString(),
      project: { id: project.id, version: project.updatedAt.toISOString() },
      currentDraft: draft ? { branchId: draft.id, workingVersion: draft.version, currentRevisionId: draft.currentRevisionId } : null,
      selectedObjects: selectedItems.map(({ objectType, objectId, version, ownership, whySelected, truncated }) => ({ objectType, objectId, version, ownership, whySelected, truncated })),
      methodVersions: [
        ...(legacy.defaultMethod ? [{ assetId: legacy.defaultMethod.assetId, versionId: legacy.defaultMethod.versionId, version: legacy.defaultMethod.version }] : []),
        ...legacy.selectedMethods.map(({ methodAssetId, methodVersionId, version }) => ({ assetId: methodAssetId, versionId: methodVersionId, version })),
      ],
      creatorProfile: project.creatorProfile ? { id: project.creatorProfile.id, version: project.creatorProfile.updatedAt.toISOString() } : null,
      confirmedInformationRefs: factItems.map(({ objectId }) => objectId),
      sourceRefs: [...new Set(sources.map(({ objectId }) => objectId))],
      externalRefs: [...new Set(sources.map(({ objectId }) => objectId))],
      items,
      truncation: { any: legacy.contextTruncated || items.some(({ truncated }) => truncated), categories },
    };
    const manifestId = createHash("sha256").update(JSON.stringify(manifestCore)).digest("hex").slice(0, 24);
    const manifest: ContextManifest = { ...manifestCore, manifestId };
    const legacyContext = record(legacy.context);
    const context = {
      ...legacyContext,
      currentDraft: draft ? { branchId: draft.id, workingVersion: draft.version, currentRevisionId: draft.currentRevisionId, updatedAt: draft.updatedAt.toISOString(), body: bounded(draft.workingBody, budgets.draft).content, truncated: draftItem?.truncated ?? false } : legacyContext.currentDraft,
      selectedObjects: selectedItems,
      contextManifest: { manifestId, schemaVersion: manifest.schemaVersion },
    };
    return { ...legacy, context, manifest, contextTruncated: manifest.truncation.any };
  }
}

export type ContextBuilderV2Result = NonNullable<Awaited<ReturnType<ContextBuilderV2["build"]>>>;
