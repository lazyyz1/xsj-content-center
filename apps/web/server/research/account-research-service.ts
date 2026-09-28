import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@content-center/db";
import { researchMember, ResearchError, type ResearchActor } from "./access";
import { createResearchSession, reserveResearchRun, researchRunExpired } from "./service";
import { ACCOUNT_RESEARCH_QUESTION } from "./account-research-run";
import { parseAccountResearchState } from "./account-research-contract";
import { collectAccountResearchEvidence, planAccountResearch } from "./account-research-evidence";
import { researchScopeSchema } from "./contracts";
import { accountResearchFacts } from "./account-research-analysis";
import { accountEvidenceSources } from "./account-research-run";

export const accountResearchRequestSchema = z.object({ requestKey: z.string().uuid(), collectionRunId: z.string().min(1).max(200).optional(), from: z.string().date().optional(), to: z.string().date().optional() }).strict().refine(value => !value.from || !value.to || value.from <= value.to, "Invalid range");
function sessionKey(actor: ResearchActor, accountId: string) {
  const hash = createHash("sha256").update(`account-research:${actor.workspaceId}:${actor.userId}:${accountId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
async function findAccountSession(actor: ResearchActor, accountId: string) {
  return db.researchSession.findUnique({ where: { workspaceId_createdById_requestKey: { workspaceId: actor.workspaceId, createdById: actor.userId, requestKey: sessionKey(actor, accountId) } } });
}
export async function startAccountResearch(actor: ResearchActor, accountId: string, value: unknown) {
  await researchMember(actor, true);
  const input = accountResearchRequestSchema.parse(value);
  const account = await db.benchmarkAccount.findFirst({ where: { id: accountId, workspaceId: actor.workspaceId, enabled: true }, select: { id: true, name: true } });
  if (!account) throw new ResearchError("NOT_FOUND", "账号不存在或不可访问。", 404);
  const existing = await findAccountSession(actor, accountId);
  const session = existing ?? await createResearchSession(actor, { title: `${account.name} · 持续研究`.slice(0, 200), entryTemplate: "BENCHMARK", requestKey: sessionKey(actor, accountId) });
  const reserved = await reserveResearchRun(actor, session.id, { question: ACCOUNT_RESEARCH_QUESTION, requestKey: input.requestKey, scope: {
    materialIds: [], benchmarkAccountIds: [accountId], trendKeys: [], notes: "", useOwnArtifacts: false, useCreatorProfile: false, researchProfile: "ACCOUNT_DOSSIER",
    ...(input.collectionRunId ? { benchmarkCollectionRunId: input.collectionRunId } : {}),
    ...(input.from || input.to ? { researchDateRange: { from: input.from, to: input.to } } : {}),
  } });
  return { sessionId: session.id, runId: reserved.run.id, version: reserved.run.version, status: researchRunExpired(reserved.run) ? "FAILED" : reserved.run.status, created: reserved.created, unchanged: reserved.unchanged };
}
export async function accountResearchOverview(actor: ResearchActor, accountId: string, input: { collectionRunId?: string; from?: string; to?: string } = {}) {
  await researchMember(actor);
  const session = await findAccountSession(actor, accountId);
  const runs = session ? await db.researchRun.findMany({ where: { sessionId: session.id, workspaceId: actor.workspaceId, requestedById: actor.userId }, orderBy: { version: "desc" }, take: 30, select: { id: true, sessionId: true, version: true, status: true, stage: true, createdAt: true, finishedAt: true, savedAt: true, coverage: true, inputScope: true, errorMessage: true } }) : [];
  const latest = runs.find(run => run.status === "COMPLETED" && parseAccountResearchState(run.coverage)) ?? null;
  const state = latest ? parseAccountResearchState(latest.coverage) : null;
  const scope = researchScopeSchema.parse({ benchmarkAccountIds: [accountId], researchProfile: "ACCOUNT_DOSSIER", ...(input.collectionRunId ? { benchmarkCollectionRunId: input.collectionRunId } : {}), ...(input.from || input.to ? { researchDateRange: { from: input.from, to: input.to } } : {}) });
  let update: { needed: boolean; added: number; updatedText: number; updatedMetadata: number; removed: number; readable: number; metadata: number; comments: number; pending: number } | null = null;
  let currentEvidence: Array<{ id: string; bodyHash: string | null; metadataHash: string }> = [];
  try {
    const evidence = await collectAccountResearchEvidence(actor, scope);
    currentEvidence = evidence.works.map(work => ({ id: work.id, bodyHash: work.bodyHash, metadataHash: work.metadataHash }));
    const plan = planAccountResearch(evidence, state, latest?.id ?? null);
    update = { needed: !state || state.evidence.fingerprint !== evidence.fingerprint || plan.analyzedRefs.length > 0 || plan.pendingRefs.length > 0,
      added: plan.delta.added.length, updatedText: plan.delta.updatedText.length, updatedMetadata: plan.delta.updatedMetadata.length, removed: plan.delta.removed.length,
      readable: plan.delta.currentTextCount, metadata: evidence.works.length, comments: evidence.comments.length, pending: plan.pendingRefs.length };
  } catch (error) { if (!(error instanceof ResearchError && error.code === "NO_ACCOUNT_EVIDENCE")) throw error; }
  return { sessionId: session?.id ?? null, latest, state, update, currentEvidence, failure: runs[0] && (runs[0].status === "FAILED" || researchRunExpired(runs[0])) ? runs[0].errorMessage || "上次研究未完成，可重新更新。" : null,
    active: runs.find(run => ["QUEUED", "RUNNING"].includes(run.status) && !researchRunExpired(run)) ?? null,
    history: runs.filter(run => run.status === "COMPLETED").map(run => { const snapshot = parseAccountResearchState(run.coverage); return { id: run.id, sessionId: run.sessionId, version: run.version, at: run.finishedAt?.toISOString() ?? run.createdAt.toISOString(), saved: Boolean(run.savedAt), works: snapshot?.evidence.works.length ?? 0, texts: snapshot?.evidence.works.filter(work => work.bodyHash).length ?? 0, comments: snapshot?.evidence.comments.length ?? 0, previousRunId: snapshot?.previousRunId ?? null }; }) };
}

export function accountResearchView(overview: Awaited<ReturnType<typeof accountResearchOverview>>) {
  const state = overview.state;
  const requested = overview.latest ? researchScopeSchema.parse(overview.latest.inputScope) : null;
  return { sessionId: overview.sessionId, update: overview.update, failure: overview.failure,
    active: overview.active ? { id: overview.active.id, sessionId: overview.active.sessionId, status: overview.active.status, stage: overview.active.stage } : null,
    latest: overview.latest ? { id: overview.latest.id, sessionId: overview.latest.sessionId, version: overview.latest.version, date: overview.latest.finishedAt?.toISOString() ?? overview.latest.createdAt.toISOString(), saved: Boolean(overview.latest.savedAt) } : null,
    requestedScope: { collectionRunId: requested?.benchmarkCollectionRunId ?? state?.evidence.collectionRunId ?? "history", from: requested?.researchDateRange?.from ?? "", to: requested?.researchDateRange?.to ?? "" },
    history: overview.history,
    report: state?.answer ? { answer: state.answer, workAnalyses: state.workAnalyses, delta: state.delta, previousRunId: state.previousRunId,
      facts: accountResearchFacts(state.evidence, state.workAnalyses), capturedAt: state.evidence.capturedAt, fingerprint: state.evidence.fingerprint,
      sources: accountEvidenceSources(state).map(source => ({ ...source, excerpt: "" })),
      works: state.evidence.works.map(work => ({ ref: work.ref, id: work.id, sourceItemId: work.sourceItemId, title: work.title, publishedAt: work.publishedAt, hasBody: Boolean(work.bodyHash), contentVersion: work.contentVersion })),
      analyzedCount: state.analyzedRefs.length, reusedCount: state.reusedRefs.length, pendingCount: state.pendingRefs.length } : null };
}
export type AccountResearchView = ReturnType<typeof accountResearchView>;
