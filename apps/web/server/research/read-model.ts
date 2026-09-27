import "server-only";
import { db } from "@content-center/db";
import type { ResearchBlock, ResearchCoverage } from "@content-center/core";
import { personalSessionWhere, researchMember, ResearchError, type ResearchActor } from "./access";
import { researchBlocksSchema, researchScopeSchema } from "./contracts";
import type { ResearchSessionView } from "./service";

export function researchSessionView(session: ResearchSessionView) {
  return { session: { id: session.id, title: session.title, entryTemplate: session.entryTemplate, project: session.project ? { id: session.project.id, title: session.project.title } : null }, hasOlder: session.hasOlder,
    runs: session.runs.map(run => ({ id: run.id, question: run.question, version: run.version, status: run.status, stage: run.stage, savedAt: run.savedAt?.toISOString() ?? null, createdAt: run.createdAt.toISOString(), errorMessage: run.errorMessage, blocks: researchBlocksSchema.parse(run.blocks), scope: researchScopeSchema.parse(run.inputScope), coverage: run.coverage && typeof run.coverage === "object" && "requested" in run.coverage ? run.coverage as unknown as ResearchCoverage : null })) };
}
export async function listResearchResults(actor: ResearchActor, query = "") {
  await researchMember(actor);
  return db.researchRun.findMany({ where: { workspaceId: actor.workspaceId, requestedById: actor.userId, session: personalSessionWhere(actor), status: "COMPLETED", savedAt: { not: null }, ...(query.trim() ? { OR: [{ question: { contains: query.trim().slice(0, 100), mode: "insensitive" as const } }, { resultTitle: { contains: query.trim().slice(0, 100), mode: "insensitive" as const } }] } : {}) }, orderBy: [{ savedAt: "desc" }, { id: "desc" }], take: 30, select: { id: true, question: true, resultTitle: true, savedAt: true, version: true, sessionId: true, session: { select: { entryTemplate: true, title: true } } } });
}
export async function getResearchResult(actor: ResearchActor, runId: string) {
  await researchMember(actor);
  const run = await db.researchRun.findFirst({ where: { id: runId, workspaceId: actor.workspaceId, requestedById: actor.userId, session: personalSessionWhere(actor), status: "COMPLETED", savedAt: { not: null } }, include: { session: { select: { id: true, title: true } } } });
  if (!run) throw new ResearchError("NOT_FOUND", "研究成果不存在或未保存。", 404);
  return { ...run, blocks: researchBlocksSchema.parse(run.blocks) as ResearchBlock[] };
}

export async function researchResultLibrary(actor: ResearchActor, input: { q?: string; library?: string; type?: string; projectId?: string; accountId?: string; trendKey?: string; before?: string; page?: string }) {
  await researchMember(actor);
  const page = Math.min(1000, Math.max(1, Number(input.page) || 1));
  const take = 20; const query = input.q?.trim().slice(0, 100);
  const date = input.before && /^\d{4}-\d{2}-\d{2}$/.test(input.before) ? new Date(`${input.before}T23:59:59.999+08:00`) : null;
  const before = date && !Number.isNaN(date.getTime()) ? date : undefined;
  if (input.library === "workspace") {
    const where = { workspaceId: actor.workspaceId, status: "COMPLETED" as const, ...(input.accountId ? { benchmarkAccountId: input.accountId } : {}), ...(query ? { benchmarkAccount: { name: { contains: query, mode: "insensitive" as const } } } : {}), ...(before ? { createdAt: { lte: before } } : {}) };
    const [rows, count] = await Promise.all([db.benchmarkStudy.findMany({ where, select: { id: true, version: true, createdAt: true, sampleCount: true, benchmarkAccount: { select: { id: true, name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * take, take }), db.benchmarkStudy.count({ where })]);
    return { items: rows.map(row => ({ id: row.id, kind: "study", title: `${row.benchmarkAccount.name} · 历史研究 ${row.version}`, date: row.createdAt, label: "工作空间历史", context: `${row.sampleCount} 条保存样本 · ${row.benchmarkAccount.name}` })), count, page, pages: Math.max(1, Math.ceil(count / take)) };
  }
  const scopeFilters = [...(input.accountId ? [{ inputScope: { path: ["benchmarkAccountIds"], array_contains: [input.accountId] } }] : []), ...(input.trendKey ? [{ inputScope: { path: ["trendKeys"], array_contains: [input.trendKey] } }] : [])];
  const where = { workspaceId: actor.workspaceId, requestedById: actor.userId, session: { ...personalSessionWhere(actor), ...(input.projectId ? { projectId: input.projectId } : {}), ...(["DIRECT", "BREAKDOWN", "OPPORTUNITY", "BENCHMARK"].includes(input.type ?? "") ? { entryTemplate: input.type } : {}) }, status: "COMPLETED" as const, savedAt: { not: null, ...(before ? { lte: before } : {}) }, ...(scopeFilters.length ? { AND: scopeFilters } : {}), ...(query ? { OR: [{ question: { contains: query, mode: "insensitive" as const } }, { resultTitle: { contains: query, mode: "insensitive" as const } }] } : {}) };
  const [rows, count] = await Promise.all([db.researchRun.findMany({ where, select: { id: true, question: true, resultTitle: true, savedAt: true, version: true, session: { select: { entryTemplate: true, project: { select: { title: true } } } } }, orderBy: [{ savedAt: "desc" }, { id: "desc" }], skip: (page - 1) * take, take }), db.researchRun.count({ where })]);
  return { items: rows.map(row => ({ id: row.id, kind: "run", title: row.resultTitle || row.question, date: row.savedAt!, label: "私人研究", context: `第 ${row.version} 次研究${row.session.project ? ` · 项目背景：${row.session.project.title}` : ""}` })), count, page, pages: Math.max(1, Math.ceil(count / take)) };
}
export async function researchProjectOptions(actor: ResearchActor) {
  await researchMember(actor);
  return db.contentProject.findMany({ where: { workspaceId: actor.workspaceId, status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 100 });
}
