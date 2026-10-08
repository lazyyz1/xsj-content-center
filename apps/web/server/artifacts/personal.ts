import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db, type Prisma } from "@content-center/db";
import type { PersonalContentView, ContentContextSnapshot, AdoptedResearch } from "@/lib/contracts/content";
import { ResearchError, researchMember, type ResearchActor } from "../research/access";
import { researchBlockSchema, researchSelectionSchema } from "../research/contracts";
import { getSelectedResearch } from "../research/read-model";
import { writeDraftRevisionInTransaction, DraftServiceError } from "../drafts/service";

const id = z.string().trim().min(1).max(200);
export const createPersonalContentSchema = z.object({
  clientRequestId: z.string().uuid(), title: z.string().max(200).default(""), body: z.string().max(1_000_000).default(""),
  ownAngle: z.string().max(4000).default(""), projectId: id.nullable().optional(),
  research: z.object({ sourceId: id, selection: researchSelectionSchema }).strict().optional(),
  poolResearchRunId:id.optional(),
}).strict();
const adoptedSchema = z.object({ kind: z.enum(["run", "study"]), sourceId: id, version: z.number().int().positive(), title: z.string().max(500), adoptedAt: z.string().datetime(), fingerprint: z.string(), blocks: z.array(researchBlockSchema) }).strict();
export const contentContextSchema = z.object({ schemaVersion: z.literal("content-context-v1"), ownAngle: z.string().max(4000).default(""), adoptedResearch: z.array(adoptedSchema).max(8), sourceItemIds: z.array(id).max(8).default([]), skillVersionIds: z.array(id).max(5).default([]),poolResearchRunId:id.optional() }).strict();
const include = { project: { select: { id: true, title: true } }, draftBranch: { include: { currentRevision: true, revisions: { orderBy: { revision: "desc" as const }, take: 50 } } }, conversation: true } satisfies Prisma.ArtifactInclude;
type ContentRow = Prisma.ArtifactGetPayload<{ include: typeof include }>;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const conflict = () => new ResearchError("CONTENT_VERSION_CONFLICT", "稿件已在其他位置更新。你的修改仍保留，请核对最新版本再保存。", 409);
function selectedReferenceBlocks(blocks: AdoptedResearch["blocks"]): AdoptedResearch["blocks"] {
  // Citations retain their identity and links. Their full source body is not an adopted fragment.
  return blocks.map(block => block.type === "sources" ? { ...block, refs: block.refs.map(source => ({ ...source, excerpt: "" })) } : block);
}

export function parseContentContext(value: unknown): ContentContextSnapshot & { ownAngle: string } {
  const result = contentContextSchema.safeParse(value);
  if (!result.success) throw new ResearchError("CONTENT_CONTEXT_INVALID", "保存的参考无法读取，请重新选择；稿件仍保留。", 409);
  return { ...result.data, adoptedResearch: result.data.adoptedResearch.map(reference => ({ ...reference, blocks: selectedReferenceBlocks(reference.blocks) })) };
}
export async function personalContentForUser(actor: ResearchActor, artifactId: string, write = false) {
  await researchMember(actor, write);
  const row = await db.artifact.findFirst({ where: { id: artifactId, workspaceId: actor.workspaceId, createdById: actor.userId, visibility: "PRIVATE", draftBranch: { deletedAt: null } }, include });
  if (!row || row.draftBranch.workspaceId !== actor.workspaceId || row.draftBranch.createdById !== actor.userId || row.draftBranch.projectId || !row.conversation || row.conversation.createdById !== actor.userId || row.conversation.workspaceId !== actor.workspaceId || row.conversation.projectId || row.conversation.canvasObjectId) throw new ResearchError("CONTENT_NOT_FOUND", "这条内容不存在或不可访问。", 404);
  return row;
}
function view(row: ContentRow): PersonalContentView {
  const context = parseContentContext(row.conversation?.contextSnapshot);
  const branch = row.draftBranch;
  return {
    artifactId: row.id, type: "TEXT", title: row.title, content: branch.workingBody, version: branch.version,
    excerpt: branch.workingBody.replace(/\s+/g, " ").slice(0, 180), updatedAt: row.updatedAt.toISOString(),
    projectId: row.projectId, projectTitle: row.project?.title ?? null, visibility: "PRIVATE",
    threadId: row.conversation!.id, contextVersion: row.conversation!.contextVersion,
    ownAngle: context.ownAngle, sourceItemIds: context.sourceItemIds, skillVersionIds: context.skillVersionIds, references: context.adoptedResearch,
    revisions: branch.revisions.map(revision => ({ id: revision.id, revision: revision.revision, title: revision.title, body: revision.body, outline: Array.isArray(revision.outline) ? revision.outline.filter((item): item is string => typeof item === "string") : [], origin: revision.origin, originNote: revision.originNote, createdAt: revision.createdAt.toISOString(), current: branch.currentRevisionId === revision.id })),
  };
}
export async function getPersonalContent(actor: ResearchActor, artifactId: string) { return view(await personalContentForUser(actor, artifactId)); }
export async function preservePersonalWorkingDraft(tx: Prisma.TransactionClient, actor: ResearchActor, branch: { id: string; version: number; workingTitle: string; workingBody: string; currentRevisionId: string | null }, note: string) {
  const checkpoint = branch.currentRevisionId ? await tx.draftRevision.findUnique({ where: { id: branch.currentRevisionId } }) : null;
  if (checkpoint?.title === branch.workingTitle && checkpoint.body === branch.workingBody) return branch.version;
  const saved = await writeDraftRevisionInTransaction(tx, { ...actor, projectId: null, branchId: branch.id, primaryDraftBranchId: null, expectedVersion: branch.version, title: branch.workingTitle, body: branch.workingBody, outline: [], origin: "HUMAN", originNote: note });
  return saved.branch.version;
}
async function checkWriter(tx: Prisma.TransactionClient, actor: ResearchActor) {
  const member = await tx.workspaceMember.findFirst({ where: { ...actor, disabledAt: null, role: { not: "VIEWER" }, workspace: { disabledAt: null }, user: { disabledAt: null } }, select: { userId: true } });
  if (!member) throw new ResearchError("FORBIDDEN", "当前账号没有修改此内容的权限。", 403);
}
async function checkClassification(actor: ResearchActor, projectId: string | null | undefined) {
  if (!projectId) return;
  const project = await db.contentProject.findFirst({ where: { id: projectId, workspaceId: actor.workspaceId, status: { not: "ARCHIVED" } }, select: { id: true } });
  if (!project) throw new ResearchError("PROJECT_NOT_FOUND", "分类项目不存在或已归档。", 404);
}
async function researchSnapshot(actor: ResearchActor, input: NonNullable<z.infer<typeof createPersonalContentSchema>["research"]>): Promise<AdoptedResearch> {
  const selected = await getSelectedResearch(actor, input.selection.kind, input.sourceId, input.selection);
  const blocks = selectedReferenceBlocks(selected.blocks);
  return { kind: input.selection.kind, sourceId: input.sourceId, version: selected.version, title: selected.title, adoptedAt: new Date().toISOString(), fingerprint: hash({ sourceId: input.sourceId, version: selected.version, blocks }), blocks };
}
export async function createPersonalContent(actor: ResearchActor, value: unknown) {
  await researchMember(actor, true);
  const input = createPersonalContentSchema.parse(value), requestHash = hash(input);
  if(input.poolResearchRunId&&(input.research?.sourceId!==input.poolResearchRunId||input.research.selection.kind!=="run"))throw new ResearchError("INVALID_POOL_REFERENCE","选题来源必须是主动采用的同一份研究。",400);
  const existing = await db.artifact.findFirst({ where: { workspaceId: actor.workspaceId, createdById: actor.userId, clientRequestId: input.clientRequestId }, select: { id: true, creationRequestHash: true } });
  if (existing) {
    if (existing.creationRequestHash !== requestHash) throw new ResearchError("CONTENT_REQUEST_CONFLICT", "该创建请求已用于另一份内容，请重新开始。", 409);
    return getPersonalContent(actor, existing.id);
  }
  await checkClassification(actor, input.projectId);
  const snapshot = input.research ? await researchSnapshot(actor, input.research) : null;
  const title = input.title.trim() || "未命名内容";
  try {
    const artifactId = await db.$transaction(async tx => {
      await checkWriter(tx, actor);
      const branch = await tx.draftBranch.create({ data: { workspaceId: actor.workspaceId, projectId: null, title, workingTitle: title, createdById: actor.userId, updatedById: actor.userId } });
      const artifact = await tx.artifact.create({ data: { workspaceId: actor.workspaceId, createdById: actor.userId, projectId: input.projectId || null, draftBranchId: branch.id, title, type: "TEXT", visibility: "PRIVATE", clientRequestId: input.clientRequestId, creationRequestHash: requestHash } });
      await tx.assistantThread.create({ data: { workspaceId: actor.workspaceId, createdById: actor.userId, projectId: null, artifactId: artifact.id, contextSnapshot: json({ schemaVersion: "content-context-v1", ownAngle: input.ownAngle, adoptedResearch: snapshot ? [snapshot] : [],...(input.poolResearchRunId?{poolResearchRunId:input.poolResearchRunId}:{}) }) } });
      await writeDraftRevisionInTransaction(tx, { ...actor, projectId: null, branchId: branch.id, primaryDraftBranchId: null, expectedVersion: 0, title, body: input.body, outline: [], origin: "HUMAN", originNote: "开始自己的独立稿件" });
      return artifact.id;
    });
    return getPersonalContent(actor, artifactId);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const winner = await db.artifact.findFirst({ where: { workspaceId: actor.workspaceId, createdById: actor.userId, clientRequestId: input.clientRequestId }, select: { id: true, creationRequestHash: true } });
      if (winner?.creationRequestHash === requestHash) return getPersonalContent(actor, winner.id);
    }
    throw error;
  }
}
export async function listPersonalContents(actor: ResearchActor, query: { q?: string; projectId?: string; unclassified?: boolean } = {}) {
  await researchMember(actor);
  const rows = await db.artifact.findMany({ where: { workspaceId: actor.workspaceId, createdById: actor.userId, visibility: "PRIVATE", draftBranch: { deletedAt: null }, ...(query.q?.trim() ? { title: { contains: query.q.trim().slice(0, 100), mode: "insensitive" } } : {}), ...(query.unclassified ? { projectId: null } : query.projectId ? { projectId: query.projectId } : {}) }, include, orderBy: { updatedAt: "desc" }, take: 100 });
  return rows.map(view);
}
export async function savePersonalDraft(actor: ResearchActor, artifactId: string, input: { expectedVersion: number; title: string; body: string }) {
  const row = await personalContentForUser(actor, artifactId, true), title = input.title.trim() || "未命名内容";
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0 || title.length > 200 || input.body.length > 1_000_000) throw new ResearchError("INVALID_INPUT", "稿件内容或版本无效。", 400);
  await db.$transaction(async tx => {
    await checkWriter(tx, actor);
    const current = await tx.draftBranch.findFirst({ where: { id: row.draftBranchId, workspaceId: actor.workspaceId, deletedAt: null } });
    if (!current || current.version !== input.expectedVersion) throw conflict();
    if (current.workingTitle === title && current.workingBody === input.body) return;
    const changed = await tx.draftBranch.updateMany({ where: { id: current.id, workspaceId: actor.workspaceId, deletedAt: null, version: input.expectedVersion }, data: { title, workingTitle: title, workingBody: input.body, workingOrigin: "HUMAN", version: { increment: 1 }, updatedById: actor.userId } });
    if (changed.count !== 1) throw conflict();
    await tx.artifact.update({ where: { id: artifactId }, data: { title, updatedAt: new Date() } });
  });
  return getPersonalContent(actor, artifactId);
}
export async function checkpointPersonalContent(actor: ResearchActor, artifactId: string, input: { expectedVersion: number; restoreRevisionId?: string }) {
  const row = await personalContentForUser(actor, artifactId, true);
  try {
    await db.$transaction(async tx => {
      await checkWriter(tx, actor);
      const branch = await tx.draftBranch.findFirst({ where: { id: row.draftBranchId, workspaceId: actor.workspaceId, deletedAt: null } });
      if (!branch || branch.version !== input.expectedVersion) throw conflict();
      const prior = input.restoreRevisionId ? await tx.draftRevision.findFirst({ where: { id: input.restoreRevisionId, draftBranchId: branch.id, workspaceId: actor.workspaceId } }) : null;
      if (input.restoreRevisionId && !prior) throw new ResearchError("CONTENT_REVISION_NOT_FOUND", "该版本不属于这条内容。", 404);
      const expectedVersion = prior ? await preservePersonalWorkingDraft(tx, actor, branch, "恢复前保存工作草稿") : branch.version;
      await writeDraftRevisionInTransaction(tx, { ...actor, projectId: null, branchId: branch.id, primaryDraftBranchId: null, expectedVersion, title: prior?.title ?? branch.workingTitle, body: prior?.body ?? branch.workingBody, outline: [], origin: "HUMAN", originNote: prior ? "从历史版本恢复，保留后续版本" : "保存一版稿件" });
      await tx.artifact.update({ where: { id: artifactId }, data: { title: prior?.title ?? branch.workingTitle, updatedAt: new Date() } });
    });
  } catch (error) { if (error instanceof DraftServiceError && error.code === "DRAFT_VERSION_CONFLICT") throw conflict(); throw error; }
  return getPersonalContent(actor, artifactId);
}
export async function classifyPersonalContent(actor: ResearchActor, artifactId: string, projectId: string | null) {
  await personalContentForUser(actor, artifactId, true); await checkClassification(actor, projectId);
  await db.$transaction(async tx => {
    await checkWriter(tx, actor);
    await tx.artifact.update({ where: { id: artifactId }, data: { projectId } });
    await tx.auditLog.create({ data: { ...actor, action: "artifact.classified", resourceType: "artifact", resourceId: artifactId, metadata: json({ projectId, visibilityChanged: false }) } });
  });
  return getPersonalContent(actor, artifactId);
}
export async function updatePersonalContext(actor: ResearchActor, artifactId: string, input: { expectedContextVersion: number; ownAngle: string; sourceItemIds?: string[]; skillVersionIds?: string[]; research?: NonNullable<z.infer<typeof createPersonalContentSchema>["research"]> }) {
  const row = await personalContentForUser(actor, artifactId, true);
  const current = parseContentContext(row.conversation!.contextSnapshot);
  if (input.ownAngle.length > 4000) throw new ResearchError("INVALID_INPUT", "自己的角度最多4000字。", 400);
  const reference = input.research ? await researchSnapshot(actor, input.research) : null;
  const sources = [...new Set(input.sourceItemIds ?? current.sourceItemIds)], skills = [...new Set(input.skillVersionIds ?? current.skillVersionIds)];
  if (sources.length > 8 || skills.length > 5) throw new ResearchError("INVALID_INPUT", "当前最多选择8份资料、5个Skill。", 400);
  if (sources.length && await db.sourceItem.count({ where: { id: { in: sources }, workspaceId: actor.workspaceId, status: { not: "ARCHIVED" } } }) !== sources.length) throw new ResearchError("CONTENT_SOURCE_NOT_FOUND", "部分资料不存在或不可访问。", 404);
  if (skills.length && await db.methodVersion.count({ where: { id: { in: skills }, asset: { workspaceId: actor.workspaceId, ownerUserId: actor.userId, status: { not: "DISABLED" } } } }) !== skills.length) throw new ResearchError("CONTENT_SKILL_NOT_FOUND", "部分Skill不存在或不可访问。", 404);
  await db.$transaction(async tx => {
    await checkWriter(tx, actor);
    const changed = await tx.assistantThread.updateMany({ where: { id: row.conversation!.id, workspaceId: actor.workspaceId, createdById: actor.userId, artifactId, contextVersion: input.expectedContextVersion }, data: { contextSnapshot: json({ ...current, ownAngle: input.ownAngle, sourceItemIds: sources, skillVersionIds: skills, adoptedResearch: reference ? [...current.adoptedResearch.filter(item => item.sourceId !== reference.sourceId || item.kind !== reference.kind), reference].slice(-8) : current.adoptedResearch }), contextVersion: { increment: 1 } } });
    if (changed.count !== 1) throw new ResearchError("CONTENT_CONTEXT_CONFLICT", "参考或角度已更新，请核对后重试。", 409);
    await tx.artifact.update({ where: { id: artifactId }, data: { updatedAt: new Date() } });
  });
  return getPersonalContent(actor, artifactId);
}
