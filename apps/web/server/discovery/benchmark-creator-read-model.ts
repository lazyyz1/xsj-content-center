import "server-only";

import { db } from "@content-center/db";
import { benchmarkAnalysisOutputSchema, benchmarkPlaybookOutputSchema, materialDistillationGenerationSchema } from "@content-center/providers";
import { listBenchmarkStudies } from "./benchmark-study-service";

const key = (platform: string, externalId: string) => `${platform}:${externalId}`;

export type BenchmarkCreatorDetailDTO = {
  account: { id: string; name: string; platform: string; avatarUrl: string | null; bio: string | null; lastSyncedAt: string | null };
  stats: { discovered: number; collected: number; studied: number; distilled: number; copywriting: number };
  representativeSources: Array<{ id: string; title: string; coverUrl: string | null; hasTranscript: boolean; hasDistillation: boolean; hasCopywriting: boolean }>;
  highlights: Array<{ title: string; explanation: string; quality: "WORTH_KEEPING" | "OBSERVE" | "CASE_ONLY" | "DO_NOT_KEEP"; sourceItemId: string; sourceTitle: string }>;
  copywriting: Array<{ sourceItemId: string; sourceTitle: string; core: string; opening: string; progression: string[]; reusable: string[]; avoid: string[] }>;
  accountResearch: null | { sampleCount: number; groups: Array<{ title: string; items: Array<{ name: string; summary: string; sources: Array<{ id: string; title: string }> }> }> };
  playbooks: Array<{ name: string; maturity: "OBSERVE" | "STABLE"; elements: string[]; flow: string; useCase: string; sources: Array<{ id: string; title: string }> }>;
  savedMethods: Array<{ id: string; title: string; status: "SAVED" | "TRIAL" | "CORE" | "DISABLED" }>;
};

export async function getBenchmarkCreatorDetail(input: { workspaceId: string; benchmarkAccountId: string; ownerUserId: string }): Promise<BenchmarkCreatorDetailDTO | null> {
  const account = await db.benchmarkAccount.findFirst({
    where: { id: input.benchmarkAccountId, workspaceId: input.workspaceId, enabled: true },
    select: { id: true, name: true, platform: true, avatarUrl: true, bio: true, lastSyncedAt: true },
  });
  if (!account) return null;

  const [snapshots, studies, methodRows] = await Promise.all([
    db.benchmarkContentSnapshot.findMany({
      where: { workspaceId: input.workspaceId, benchmarkAccountId: account.id },
      orderBy: [{ observedAt: "desc" }, { publishedAt: "desc" }],
      select: { platform: true, externalId: true, title: true, coverUrl: true },
    }),
    listBenchmarkStudies({ workspaceId: input.workspaceId, benchmarkAccountId: account.id }),
    db.methodAsset.findMany({
      where: { workspaceId: input.workspaceId, ownerUserId: input.ownerUserId, status: { not: "DISABLED" } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: {
            title: true,
            sourceItem: { select: { sourcePlatform: true, externalId: true } },
            sourceMaterialDistillation: { select: { sourceItem: { select: { sourcePlatform: true, externalId: true } } } },
            sourceBenchmarkStudy: { select: { benchmarkAccountId: true } },
          },
        },
      },
    }),
  ]);

  const snapshotKeys = new Set(snapshots.map((snapshot) => key(snapshot.platform, snapshot.externalId)));
  const sources = snapshots.length ? await db.sourceItem.findMany({
    where: { workspaceId: input.workspaceId, OR: snapshots.map((snapshot) => ({ sourcePlatform: snapshot.platform, externalId: snapshot.externalId })) },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      sourcePlatform: true,
      externalId: true,
      transcript: { select: { updatedAt: true } },
      materialDistillations: {
        where: { status: "COMPLETED" },
        orderBy: { version: "desc" },
        take: 20,
        select: { id: true, version: true, schemaVersion: true, output: true, transcriptUpdatedAtAtDistillation: true },
      },
    },
  }) : [];
  const sourceMap = new Map(sources.map((source) => [key(source.sourcePlatform, source.externalId ?? ""), source]));
  const parsedBySource = new Map<string, ReturnType<typeof materialDistillationGenerationSchema.parse>>();
  for (const source of sources) {
    if (!source.transcript) continue;
    const current = source.materialDistillations.find((distillation) => {
      if (distillation.schemaVersion !== "material-distillation-v2" || distillation.transcriptUpdatedAtAtDistillation.getTime() !== source.transcript?.updatedAt.getTime()) return false;
      const parsed = materialDistillationGenerationSchema.safeParse(distillation.output);
      if (!parsed.success) return false;
      const evidence = [...parsed.data.highlights.flatMap((highlight) => highlight.evidence), ...(parsed.data.copywriting?.evidence ?? [])];
      if (!evidence.some(({ sourceRef }) => Boolean(sourceRef))) return false;
      parsedBySource.set(source.id, parsed.data);
      return true;
    });
    if (!current) parsedBySource.delete(source.id);
  }

  const representativeSources = snapshots.flatMap((snapshot) => {
    const source = sourceMap.get(key(snapshot.platform, snapshot.externalId));
    if (!source) return [];
    const output = parsedBySource.get(source.id);
    return [{ id: source.id, title: source.title || snapshot.title || "未命名内容", coverUrl: snapshot.coverUrl ?? source.thumbnailUrl, hasTranscript: Boolean(source.transcript), hasDistillation: Boolean(output), hasCopywriting: Boolean(output?.copywriting) }];
  }).slice(0, 8);

  const highlights = representativeSources.flatMap((source) => (parsedBySource.get(source.id)?.highlights ?? []).map((highlight) => ({ title: highlight.title, explanation: highlight.essence, quality: highlight.quality, sourceItemId: source.id, sourceTitle: source.title }))).slice(0, 12);
  const copywriting = representativeSources.flatMap((source) => {
    const result = parsedBySource.get(source.id)?.copywriting;
    return result ? [{ sourceItemId: source.id, sourceTitle: source.title, core: result.coreProposition, opening: result.openingLogic, progression: result.progression, reusable: result.reusableStrategies, avoid: result.doNotCopy }] : [];
  }).slice(0, 6);

  const completedStudies = studies.filter(({ status }) => status === "COMPLETED");
  const studiedSourceIds = new Set(completedStudies.flatMap((study) => study.samples.map(({ sourceItemId }) => sourceItemId)));
  const research = completedStudies.find((study) => study.kind === "ACCOUNT_RESEARCH" && study.output && !("kind" in study.output));
  const parsedResearch = research ? benchmarkAnalysisOutputSchema.safeParse(research.output) : null;
  const researchGroups = parsedResearch?.success ? [
    ["常见主题", parsedResearch.data.topicDirections], ["常用开头", parsedResearch.data.openingPatterns], ["常见结构", parsedResearch.data.structures],
    ["论据与说服", parsedResearch.data.persuasionMethods], ["表达特点", parsedResearch.data.expressionHabits], ["常见收尾", parsedResearch.data.endings],
  ].flatMap(([title, findings]) => Array.isArray(findings) && findings.length ? [{ title: title as string, items: findings.slice(0, 4).map((finding) => ({ name: finding.name, summary: finding.summary, sources: finding.occurrenceSampleIds.flatMap((sampleId) => { const sample = research?.samples.find(({ id }) => id === sampleId); return sample ? [{ id: sample.sourceItemId, title: sample.title }] : []; }) })) }] : []) : [];

  const playbookStudy = completedStudies.find((study) => study.kind === "PLAYBOOKS" && study.output && "kind" in study.output && study.output.playbooks.length > 0);
  const parsedPlaybooks = playbookStudy ? benchmarkPlaybookOutputSchema.safeParse(playbookStudy.output) : null;
  const playbooks = parsedPlaybooks?.success ? parsedPlaybooks.data.playbooks.map((playbook) => ({
    name: playbook.name,
    maturity: playbook.maturity,
    elements: playbook.elements,
    flow: playbook.flow,
    useCase: playbook.useCase,
    sources: playbook.supportSampleIds.flatMap((sampleId) => { const sample = playbookStudy?.samples.find(({ id }) => id === sampleId); return sample ? [{ id: sample.sourceItemId, title: sample.title }] : []; }),
  })) : [];

  const savedMethods = methodRows.flatMap((method) => {
    const current = method.versions[0];
    if (!current) return [];
    const source = current.sourceItem ?? current.sourceMaterialDistillation?.sourceItem;
    const belongs = current.sourceBenchmarkStudy?.benchmarkAccountId === account.id || Boolean(source?.externalId && snapshotKeys.has(key(source.sourcePlatform, source.externalId)));
    return belongs ? [{ id: method.id, title: current.title, status: method.status }] : [];
  }).slice(0, 8);

  return {
    account: { ...account, lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null },
    stats: { discovered: snapshots.length, collected: sources.length, studied: studiedSourceIds.size, distilled: parsedBySource.size, copywriting: copywriting.length },
    representativeSources,
    highlights,
    copywriting,
    accountResearch: parsedResearch?.success && research ? { sampleCount: research.sampleCount, groups: researchGroups } : null,
    playbooks,
    savedMethods,
  };
}
