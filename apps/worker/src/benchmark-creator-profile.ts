import { db, type Prisma } from "@content-center/db";
import {
  LLMError,
  benchmarkAnalysisOutputSchema,
  benchmarkCreatorProfileGenerationSchema,
  benchmarkCreatorProfileGenerationV2Schema,
  benchmarkCreatorProfileGenerationV3Schema,
  benchmarkCreatorProfileInputSchema,
  benchmarkCreatorProfileInputV2Schema,
  benchmarkCreatorProfileInputV3Schema,
  benchmarkCreatorProfileOutputInstruction,
  benchmarkCreatorProfileOutputV2Instruction,
  benchmarkCreatorProfileOutputV3Instruction,
  benchmarkCreatorProfileOutputSchema,
  benchmarkCreatorProfileOutputV2Schema,
  benchmarkCreatorProfileOutputV3Schema,
  benchmarkCreatorProfileCardCandidateSchema,
  benchmarkCreatorProfileCardCandidateV3Schema,
  benchmarkCreatorProfileClaimCandidateSchema,
  benchmarkCreatorProfileSectionCandidateSchema,
  benchmarkCreatorProfileSystemBoundary,
  buildTranscriptSourceIndex,
  generationQualityContract,
  materialDistillationGenerationSchema,
  type BenchmarkCreatorProfileGeneration,
  type BenchmarkCreatorProfileGenerationV2,
  type BenchmarkCreatorProfileGenerationV3,
  type BenchmarkCreatorProfileInput,
  type BenchmarkCreatorProfileInputV2,
  type BenchmarkCreatorProfileInputV3,
  type BenchmarkCreatorProfileOutput,
  type BenchmarkCreatorProfileOutputV2,
  type BenchmarkCreatorProfileOutputV3,
  type BenchmarkCreatorProfileCardCandidate,
  type BenchmarkCreatorProfileClaimCandidate,
  type BenchmarkCreatorProfileSectionCandidate,
  type MaterialDistillationOutput,
  type TranscriptSourceIndex,
} from "@content-center/providers";
import { UnrecoverableError, type Job } from "bullmq";
import { loadBenchmarkRuntime, type BenchmarkRuntime } from "./benchmark-analysis";
import type { BenchmarkStudyPayload } from "./queue";

export type CreatorProfileAtom = {
  ref: string;
  sampleId: string;
  sourceItemId: string;
  materialDistillationId: string;
  materialDistillationVersion: number;
  itemKind: "HIGHLIGHT" | "COPYWRITING";
  itemKey: string;
  title: string;
  text: string;
  type?: string;
  quality?: string;
  sourceRefs: string[];
  evidence: Array<{ ref: string; text: string }>;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function unique(items: string[]) {
  return items.filter((item, index) => items.indexOf(item) === index);
}

function evidenceForRefs(refs: string[], sourceIndex: TranscriptSourceIndex) {
  const selected = new Set(refs);
  let usedChars = 0;
  return sourceIndex.refs.flatMap(({ ref, text }) => {
    if (!selected.has(ref) || usedChars >= 1_500) return [];
    const clipped = text.slice(0, 600);
    usedChars += clipped.length;
    return [{ ref, text: clipped }];
  });
}

function copywritingAtoms(output: MaterialDistillationOutput, sourceIndex: TranscriptSourceIndex, base: Omit<CreatorProfileAtom, "ref" | "itemKind" | "itemKey" | "title" | "text" | "sourceRefs" | "evidence" | "type" | "quality">): CreatorProfileAtom[] {
  if (!output.copywriting) return [];
  const refs = unique(output.copywriting.evidence.flatMap(({ sourceRef }) => sourceRef ? [sourceRef] : []));
  const evidence = evidenceForRefs(refs, sourceIndex);
  if (!evidence.length) return [];
  const fields: Array<[string, string | string[]]> = [
    ["CORE", output.copywriting.coreProposition],
    ["ANGLE", output.copywriting.angle],
    ["OPENING", output.copywriting.openingLogic],
    ["FLOW", output.copywriting.progression],
    ["SKELETON", output.copywriting.skeleton],
    ["EVIDENCE", output.copywriting.evidenceFunction],
    ["REUSE", output.copywriting.reusableStrategies],
    ["AVOID", output.copywriting.doNotCopy],
  ];
  return fields.flatMap(([key, value]) => {
    const text = (Array.isArray(value) ? value.join("；") : value).trim();
    return text ? [{ ...base, ref: "", itemKind: "COPYWRITING" as const, itemKey: key, title: key, text, sourceRefs: evidence.map(({ ref }) => ref), evidence }] : [];
  });
}

export function buildCreatorProfileAtoms(samples: Array<{ sampleId: string; sourceItemId: string; materialDistillationId: string; materialDistillationVersion: number; output: MaterialDistillationOutput; sourceIndex: TranscriptSourceIndex }>): CreatorProfileAtom[] {
  const atoms = samples.flatMap((sample) => {
    const base = { sampleId: sample.sampleId, sourceItemId: sample.sourceItemId, materialDistillationId: sample.materialDistillationId, materialDistillationVersion: sample.materialDistillationVersion };
    const highlights = sample.output.highlights.flatMap((highlight, index): CreatorProfileAtom[] => {
      const refs = unique(highlight.evidence.flatMap(({ sourceRef }) => sourceRef ? [sourceRef] : []));
      const evidence = evidenceForRefs(refs, sample.sourceIndex);
      return evidence.length ? [{ ...base, ref: "", itemKind: "HIGHLIGHT", itemKey: String(index), title: highlight.title, text: highlight.essence, type: highlight.type, quality: highlight.quality, sourceRefs: evidence.map(({ ref }) => ref), evidence }] : [];
    });
    return [...highlights, ...copywritingAtoms(sample.output, sample.sourceIndex, base)];
  });
  return atoms.map((atom, index) => ({ ...atom, ref: `E${String(index + 1).padStart(3, "0")}` }));
}

const genericTexts = new Set(["内容专业", "选题精准", "善于建立信任", "输出价值", "具有用户思维", "注重互动"]);
const normalizedText = (value: string) => value.toLowerCase().replace(/[\s，。；、,:：.!！?？"'“”‘’（）()\-_=→>]+/gu, "");
const causalClaim = /(为什么火|爆款原因|爆火.{0,6}原因|流量密码|导致.{0,12}(高播放|爆|火)|必然.{0,12}(转化|成交|播放)|有效提高.{0,12}(转化|成交)|因此.{0,12}(爆|火|转化|成交))/u;
const ownFactClaim = /(我们|我方|我们的)(客户|收入|成绩|学校|项目|经历|案例|成交)/u;
const observationalLanguage = /(当前样本|从当前样本|可能|有助于|值得继续验证|目前观察)/u;

function valueType(value: unknown) {
  if (value === null) return "null";
  return Array.isArray(value) ? "array" : typeof value;
}

function valueAtPath(value: unknown, path: PropertyKey[]) {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

function sectionPassesLanguageGate(section: BenchmarkCreatorProfileSectionCandidate) {
  if (genericTexts.has(normalizedText(section.text))) return false;
  if (causalClaim.test(section.text)) return false;
  if (section.code !== "AVOID" && ownFactClaim.test(section.text)) return false;
  if (section.code === "ATTENTION_TRUST" && !observationalLanguage.test(section.text)) return false;
  return true;
}

export function normalizeBenchmarkCreatorProfileResult(input: BenchmarkCreatorProfileGeneration, atoms: CreatorProfileAtom[], manifest: BenchmarkCreatorProfileInput) {
  const atomMap = new Map(atoms.map((atom) => [atom.ref, atom]));
  const sections: BenchmarkCreatorProfileOutput["sections"] = [];
  const seenCodes = new Set<string>();
  const validationIssues: Array<{ path: string; code: string; expected?: string; receivedType: string }> = [];
  input.sections.forEach((candidate, index) => {
    const parsed = benchmarkCreatorProfileSectionCandidateSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const detail = issue as unknown as { code: string; path: PropertyKey[]; expected?: unknown };
        validationIssues.push({ path: ["sections", index, ...detail.path].join("."), code: detail.code, ...(typeof detail.expected === "string" ? { expected: detail.expected } : {}), receivedType: valueType(valueAtPath(candidate, detail.path)) });
      }
      return;
    }
    const section = parsed.data;
    if (seenCodes.has(section.code) || !sectionPassesLanguageGate(section)) return;
    const evidenceRefs = unique(section.evidenceRefs).filter((ref) => atomMap.has(ref));
    const sectionAtoms = evidenceRefs.map((ref) => atomMap.get(ref)!).filter(Boolean);
    const sourceCount = new Set(sectionAtoms.map(({ sourceItemId }) => sourceItemId)).size;
    const minimumSources = section.code === "POSITIONING" || section.code === "AUDIENCE" ? 1 : 2;
    if (sourceCount < minimumSources) return;
    if (section.code === "METHOD_TENDENCY") {
      const hasExpression = sectionAtoms.some((atom) => atom.itemKind === "COPYWRITING" || atom.type === "copy_structure");
      const hasMethod = sectionAtoms.some((atom) => atom.itemKind === "HIGHLIGHT" && ["method", "principle", "process", "framework", "decision_rule"].includes(atom.type ?? ""));
      if (!hasExpression || !hasMethod) return;
    }
    seenCodes.add(section.code);
    sections.push({
      code: section.code,
      text: section.text,
      evidenceRefs,
      evidence: sectionAtoms.map((atom) => ({ evidenceRef: atom.ref, sampleId: atom.sampleId, sourceItemId: atom.sourceItemId, materialDistillationId: atom.materialDistillationId, materialDistillationVersion: atom.materialDistillationVersion, itemKind: atom.itemKind, itemKey: atom.itemKey, sourceRefs: atom.sourceRefs })),
    });
  });
  if (input.sections.length > 0 && sections.length === 0) {
    throw new LLMError("LLM_INVALID_RESPONSE", "AI 模型返回的账号画像候选全部不可用。", false, { rawCandidateCount: input.sections.length, validCandidateCount: 0, droppedCandidateCount: input.sections.length, validationIssues });
  }
  const output = benchmarkCreatorProfileOutputSchema.parse({
    kind: "CREATOR_PROFILE",
    schemaVersion: "benchmark-creator-profile-v1",
    message: sections.length ? `已根据 ${manifest.distillations.length} 条代表内容形成 ${sections.length} 项账号画像观察。` : "当前样本暂时没有形成可靠的账号画像结论。",
    account: manifest.account,
    inputs: manifest.distillations,
    accountResearch: manifest.accountResearch,
    sections,
  });
  return { output, diagnostics: { rawSectionCount: input.sections.length, validSectionCount: sections.length, droppedSectionCount: input.sections.length - sections.length } };
}

export function normalizeBenchmarkCreatorProfileOutput(input: BenchmarkCreatorProfileGeneration, atoms: CreatorProfileAtom[], manifest: BenchmarkCreatorProfileInput): BenchmarkCreatorProfileOutput {
  return normalizeBenchmarkCreatorProfileResult(input, atoms, manifest).output;
}

const profileCardOrder = ["PROFILE", "CONTENT_MIX", "TOPIC_STYLE", "CONTENT_STYLE", "RECURRING_VIEWPOINT", "LEARN", "AVOID"] as const;
const actionCardCodes = new Set(["LEARN", "AVOID"]);
const emptyAdvice = new Set(["学习他的专业", "学习专业", "不要完全照搬", "注意结合自身情况"]);
const consultancyTerms = ["竞争壁垒", "增长飞轮", "商业闭环", "执行断层", "底层范式", "结构性优势", "战略杠杆", "认知占领", "生态位", "增长模型", "护城河", "失败根因"];
const specificStyleGroups = [
  /采访|访谈/u,
  /到校|现场记录/u,
  /多角色|多人复述|第三方复述/u,
  /跟拍/u,
  /直播/u,
];

function atomText(atom: CreatorProfileAtom) {
  return `${atom.title}\n${atom.text}\n${atom.evidence.map(({ text }) => text).join("\n")}`;
}

function evidenceFromAtoms(atoms: CreatorProfileAtom[]) {
  return atoms.map((atom) => ({ evidenceRef: atom.ref, sampleId: atom.sampleId, sourceItemId: atom.sourceItemId, materialDistillationId: atom.materialDistillationId, materialDistillationVersion: atom.materialDistillationVersion, itemKind: atom.itemKind, itemKey: atom.itemKey, sourceRefs: atom.sourceRefs }));
}

function supportedConsultancyLanguage(text: string, atoms: CreatorProfileAtom[]) {
  return consultancyTerms.every((term) => !text.includes(term) || new Set(atoms.filter((atom) => atomText(atom).includes(term)).map(({ sourceItemId }) => sourceItemId)).size >= 2);
}

function contentStyleIsIntersection(text: string, atoms: CreatorProfileAtom[]) {
  return specificStyleGroups.every((pattern) => !pattern.test(text) || new Set(atoms.filter((atom) => pattern.test(atomText(atom))).map(({ sourceItemId }) => sourceItemId)).size >= 2);
}

function v2LanguageGate(card: BenchmarkCreatorProfileCardCandidate, atoms: CreatorProfileAtom[], sampleCount: number) {
  if (genericTexts.has(normalizedText(card.text)) || emptyAdvice.has(normalizedText(card.text))) return false;
  if (causalClaim.test(card.text) || !supportedConsultancyLanguage(card.text, atoms)) return false;
  if (card.code !== "AVOID" && ownFactClaim.test(card.text)) return false;
  if (card.code === "CONTENT_MIX") {
    const currentSamples = new RegExp(`(?:当前(?:已)?分析的|当前样本(?:共|有)?|目前研究到的)[\\s\\S]{0,12}${sampleCount}\\s*条`, "u");
    if (!currentSamples.test(card.text) || /%|百分之|账号.{0,8}占比/u.test(card.text)) return false;
  }
  if (card.code === "CONTENT_STYLE" && !contentStyleIsIntersection(card.text, atoms)) return false;
  if (card.code === "RECURRING_VIEWPOINT" && card.text.split(/\r?\n/u).filter((line) => /^\s*[•·*-]\s*/u.test(line)).length > 3) return false;
  return true;
}

function statusAtEvidenceCeiling(card: BenchmarkCreatorProfileCardCandidate, sourceCount: number) {
  if (card.code === "PROFILE") return sourceCount >= 3 ? card.status : "OBSERVE" as const;
  return sourceCount >= 3 ? card.status : "OBSERVE" as const;
}

export function normalizeBenchmarkCreatorProfileV2Result(input: BenchmarkCreatorProfileGenerationV2, atoms: CreatorProfileAtom[], manifest: BenchmarkCreatorProfileInputV2) {
  const atomMap = new Map(atoms.map((atom) => [atom.ref, atom]));
  const parsedCards: Array<{ card: BenchmarkCreatorProfileCardCandidate; atoms: CreatorProfileAtom[] }> = [];
  const seenCodes = new Set<string>();
  const validationIssues: Array<{ path: string; code: string; expected?: string; receivedType: string }> = [];
  input.cards.forEach((candidate, index) => {
    const parsed = benchmarkCreatorProfileCardCandidateSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const detail = issue as unknown as { code: string; path: PropertyKey[]; expected?: unknown };
        validationIssues.push({ path: ["cards", index, ...detail.path].join("."), code: detail.code, ...(typeof detail.expected === "string" ? { expected: detail.expected } : {}), receivedType: valueType(valueAtPath(candidate, detail.path)) });
      }
      return;
    }
    const card = parsed.data;
    if (seenCodes.has(card.code)) return;
    const cardAtoms = unique(card.evidenceRefs).flatMap((ref) => atomMap.get(ref) ?? []);
    if (!cardAtoms.length || !v2LanguageGate(card, cardAtoms, manifest.distillations.length)) return;
    seenCodes.add(card.code);
    parsedCards.push({ card, atoms: cardAtoms });
  });

  const accepted = new Map<string, BenchmarkCreatorProfileOutputV2["cards"][number]>();
  for (const { card, atoms: cardAtoms } of parsedCards.filter(({ card }) => !actionCardCodes.has(card.code))) {
    const sourceCount = new Set(cardAtoms.map(({ sourceItemId }) => sourceItemId)).size;
    const minimumSources = card.code === "PROFILE" ? 1 : 2;
    if (sourceCount < minimumSources) continue;
    accepted.set(card.code, { code: card.code, status: statusAtEvidenceCeiling(card, sourceCount), text: card.text, evidenceRefs: cardAtoms.map(({ ref }) => ref), evidence: evidenceFromAtoms(cardAtoms) });
  }

  const upstreamCards = [...accepted.values()];
  const upstreamRefs = new Set(upstreamCards.flatMap(({ evidenceRefs }) => evidenceRefs));
  for (const { card, atoms: cardAtoms } of parsedCards.filter(({ card }) => actionCardCodes.has(card.code))) {
    const derivedAtoms = cardAtoms.filter(({ ref }) => upstreamRefs.has(ref));
    if (new Set(derivedAtoms.map(({ sourceItemId }) => sourceItemId)).size < 2) continue;
    const referencedUpstream = upstreamCards.filter(({ evidenceRefs }) => evidenceRefs.some((ref) => derivedAtoms.some((atom) => atom.ref === ref)));
    if (!referencedUpstream.length) continue;
    const status = card.status === "CLEAR" && referencedUpstream.some(({ status }) => status === "CLEAR") ? "CLEAR" : "OBSERVE";
    accepted.set(card.code, { code: card.code, status, text: card.text, evidenceRefs: derivedAtoms.map(({ ref }) => ref), evidence: evidenceFromAtoms(derivedAtoms) });
  }

  const cards = profileCardOrder.flatMap((code) => accepted.get(code) ?? []);
  if (input.cards.length > 0 && cards.length === 0) {
    throw new LLMError("LLM_INVALID_RESPONSE", "AI 模型返回的账号画像候选全部不可用。", false, { rawCandidateCount: input.cards.length, validCandidateCount: 0, droppedCandidateCount: input.cards.length, validationIssues });
  }
  const output = benchmarkCreatorProfileOutputV2Schema.parse({
    kind: "CREATOR_PROFILE",
    schemaVersion: "benchmark-creator-profile-v2",
    message: cards.length ? `已根据当前 ${manifest.distillations.length} 条代表内容形成 ${cards.length} 张账号画像卡。` : "当前研究内容还不足以判断。",
    account: manifest.account,
    inputs: manifest.distillations,
    accountResearch: manifest.accountResearch,
    priorProfileVersion: manifest.priorProfileVersion,
    cards,
  });
  return { output, diagnostics: { rawCardCount: input.cards.length, validCardCount: cards.length, droppedCardCount: input.cards.length - cards.length } };
}

export function normalizeBenchmarkCreatorProfileV2Output(input: BenchmarkCreatorProfileGenerationV2, atoms: CreatorProfileAtom[], manifest: BenchmarkCreatorProfileInputV2): BenchmarkCreatorProfileOutputV2 {
  return normalizeBenchmarkCreatorProfileV2Result(input, atoms, manifest).output;
}

type AcceptedClaim = BenchmarkCreatorProfileOutputV3["cards"][number]["claims"][number] & { status: "CLEAR" | "OBSERVE" };

function v3ClaimLanguageGate(code: string, text: string, atoms: CreatorProfileAtom[]) {
  if (genericTexts.has(normalizedText(text)) || emptyAdvice.has(normalizedText(text))) return false;
  if (causalClaim.test(text) || !supportedConsultancyLanguage(text, atoms)) return false;
  if (code !== "AVOID" && ownFactClaim.test(text)) return false;
  if (["TOPIC_STYLE", "CONTENT_STYLE", "RECURRING_VIEWPOINT"].includes(code) && /(?:一是|第一)[\s\S]{0,500}(?:二是|第二)/u.test(text)) return false;
  if (["TOPIC_STYLE", "CONTENT_STYLE", "RECURRING_VIEWPOINT"].includes(code) && text.split(/\r?\n/u).filter((line) => /^\s*[•·*-]\s*/u.test(line)).length > 1) return false;
  if (code === "TOPIC_STYLE" && /(?:(?:数字|结果).{0,80}(?:伦理|身份困境)|(?:伦理|身份困境).{0,80}(?:数字|结果))/u.test(text)) return false;
  if (code === "CONTENT_STYLE" && !contentStyleIsIntersection(text, atoms)) return false;
  return true;
}

function claimStatus(requested: "CLEAR" | "OBSERVE", sourceCount: number) {
  return requested === "CLEAR" && sourceCount >= 3 ? "CLEAR" as const : "OBSERVE" as const;
}

function cardStatus(claims: AcceptedClaim[]) {
  return claims.some(({ status }) => status === "OBSERVE") ? "OBSERVE" as const : "CLEAR" as const;
}

export function normalizeBenchmarkCreatorProfileV3Result(input: BenchmarkCreatorProfileGenerationV3, atoms: CreatorProfileAtom[], manifest: BenchmarkCreatorProfileInputV3) {
  const atomMap = new Map(atoms.map((atom) => [atom.ref, atom]));
  const validationIssues: Array<{ path: string; code: string; expected?: string; receivedType: string }> = [];
  const candidateCards = new Map<string, { status: "CLEAR" | "OBSERVE"; claims: BenchmarkCreatorProfileClaimCandidate[] }>();
  const seenCardCodes = new Set<string>();
  const seenClaimKeys = new Set<string>();
  let rawClaimCount = 0;

  input.cards.forEach((candidate, cardIndex) => {
    const parsedCard = benchmarkCreatorProfileCardCandidateV3Schema.safeParse(candidate);
    if (!parsedCard.success) {
      for (const issue of parsedCard.error.issues) {
        const detail = issue as unknown as { code: string; path: PropertyKey[]; expected?: unknown };
        validationIssues.push({ path: ["cards", cardIndex, ...detail.path].join("."), code: detail.code, ...(typeof detail.expected === "string" ? { expected: detail.expected } : {}), receivedType: valueType(valueAtPath(candidate, detail.path)) });
      }
      return;
    }
    if (seenCardCodes.has(parsedCard.data.code)) return;
    seenCardCodes.add(parsedCard.data.code);
    rawClaimCount += parsedCard.data.claims.length;
    const claims = parsedCard.data.claims.flatMap((claim, claimIndex) => {
      const parsedClaim = benchmarkCreatorProfileClaimCandidateSchema.safeParse(claim);
      if (!parsedClaim.success) {
        for (const issue of parsedClaim.error.issues) {
          const detail = issue as unknown as { code: string; path: PropertyKey[]; expected?: unknown };
          validationIssues.push({ path: ["cards", cardIndex, "claims", claimIndex, ...detail.path].join("."), code: detail.code, ...(typeof detail.expected === "string" ? { expected: detail.expected } : {}), receivedType: valueType(valueAtPath(claim, detail.path)) });
        }
        return [];
      }
      if (seenClaimKeys.has(parsedClaim.data.key)) return [];
      seenClaimKeys.add(parsedClaim.data.key);
      return [parsedClaim.data];
    });
    candidateCards.set(parsedCard.data.code, { status: parsedCard.data.status, claims });
  });

  let nextClaimId = 1;
  const nextId = () => `C${String(nextClaimId++).padStart(3, "0")}`;
  const acceptedKeys = new Map<string, AcceptedClaim>();
  const outputCards = new Map<string, BenchmarkCreatorProfileOutputV3["cards"][number]>();
  const descriptiveCodes = ["PROFILE", "TOPIC_STYLE", "CONTENT_STYLE", "RECURRING_VIEWPOINT"] as const;

  for (const code of descriptiveCodes) {
    const candidate = candidateCards.get(code);
    if (!candidate) continue;
    const claims: AcceptedClaim[] = [];
    const seenTexts = new Set<string>();
    const limited = code === "PROFILE" ? candidate.claims.slice(0, 1) : code === "RECURRING_VIEWPOINT" ? candidate.claims.slice(0, 3) : candidate.claims;
    for (const claim of limited) {
      if (claim.derivedFrom.length || seenTexts.has(normalizedText(claim.text))) continue;
      const claimAtoms = unique(claim.evidenceRefs).flatMap((ref) => atomMap.get(ref) ?? []);
      const sourceCount = new Set(claimAtoms.map(({ sourceItemId }) => sourceItemId)).size;
      if (sourceCount < (code === "PROFILE" ? 1 : 2) || !v3ClaimLanguageGate(code, claim.text, claimAtoms)) continue;
      seenTexts.add(normalizedText(claim.text));
      const accepted: AcceptedClaim = { id: nextId(), text: claim.text, evidenceRefs: claimAtoms.map(({ ref }) => ref), evidence: evidenceFromAtoms(claimAtoms), derivedFrom: [], status: claimStatus(candidate.status, sourceCount) };
      claims.push(accepted);
      acceptedKeys.set(claim.key, accepted);
    }
    if (claims.length) outputCards.set(code, { code, status: cardStatus(claims), claims: claims.map(({ status: _status, ...claim }) => claim) });
  }

  const mix = candidateCards.get("CONTENT_MIX");
  if (mix) {
    const classifications: Array<{ key: string; label: string; atoms: CreatorProfileAtom[]; sourceItemId: string }> = [];
    const seenSources = new Set<string>();
    for (const claim of mix.claims) {
      const claimAtoms = unique(claim.evidenceRefs).flatMap((ref) => atomMap.get(ref) ?? []);
      const sourceIds = [...new Set(claimAtoms.map(({ sourceItemId }) => sourceItemId))];
      if (claim.derivedFrom.length || sourceIds.length !== 1 || seenSources.has(sourceIds[0]!) || claim.text.length > 24 || /[\r\n，,。；;]/u.test(claim.text)) continue;
      seenSources.add(sourceIds[0]!);
      classifications.push({ key: claim.key, label: claim.text.trim(), atoms: claimAtoms, sourceItemId: sourceIds[0]! });
    }
    if (classifications.length === manifest.distillations.length) {
      const counts = new Map<string, number>();
      for (const { label } of classifications) counts.set(label, (counts.get(label) ?? 0) + 1);
      const distribution = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"));
      const mixAtoms = [...new Map(classifications.flatMap(({ atoms }) => atoms).map((atom) => [atom.ref, atom])).values()];
      const status = mix.status === "CLEAR" && (distribution[0]?.[1] ?? 0) >= 3 ? "CLEAR" as const : "OBSERVE" as const;
      const accepted: AcceptedClaim = { id: nextId(), text: `当前分析的 ${manifest.distillations.length} 条里：${distribution.map(([label, count]) => `${count} 条“${label}”`).join("；")}。`, evidenceRefs: mixAtoms.map(({ ref }) => ref), evidence: evidenceFromAtoms(mixAtoms), derivedFrom: [], status };
      outputCards.set("CONTENT_MIX", { code: "CONTENT_MIX", status, claims: [{ id: accepted.id, text: accepted.text, evidenceRefs: accepted.evidenceRefs, evidence: accepted.evidence, derivedFrom: [] }] });
      for (const { key } of classifications) acceptedKeys.set(key, accepted);
    }
  }

  for (const code of ["LEARN", "AVOID"] as const) {
    const candidate = candidateCards.get(code);
    if (!candidate) continue;
    const claims: AcceptedClaim[] = [];
    const seenTexts = new Set<string>();
    for (const claim of candidate.claims) {
      if (claim.evidenceRefs.length || !claim.derivedFrom.length || claim.derivedFrom.some((key) => !acceptedKeys.has(key)) || seenTexts.has(normalizedText(claim.text))) continue;
      const sources = claim.derivedFrom.map((key) => acceptedKeys.get(key)!);
      const inheritedEvidence = [...new Map(sources.flatMap(({ evidence }) => evidence).map((item) => [item.evidenceRef, item])).values()];
      const inheritedRefs = inheritedEvidence.map(({ evidenceRef }) => evidenceRef);
      const inheritedAtoms = inheritedRefs.flatMap((ref) => atomMap.get(ref) ?? []);
      if (!v3ClaimLanguageGate(code, claim.text, inheritedAtoms)) continue;
      seenTexts.add(normalizedText(claim.text));
      const status = candidate.status === "CLEAR" && sources.every((source) => source.status === "CLEAR") ? "CLEAR" as const : "OBSERVE" as const;
      claims.push({ id: nextId(), text: claim.text, evidenceRefs: inheritedRefs, evidence: inheritedEvidence, derivedFrom: sources.map(({ id }) => id), status });
    }
    if (claims.length) outputCards.set(code, { code, status: cardStatus(claims), claims: claims.map(({ status: _status, ...claim }) => claim) });
  }

  const cards = profileCardOrder.flatMap((code) => outputCards.get(code) ?? []);
  const validClaimCount = cards.reduce((count, card) => count + card.claims.length, 0);
  if (input.cards.length > 0 && validClaimCount === 0) throw new LLMError("LLM_INVALID_RESPONSE", "AI 模型返回的账号画像 claim 全部不可用。", false, { rawCandidateCount: rawClaimCount, validCandidateCount: 0, droppedCandidateCount: rawClaimCount, validationIssues });
  const output = benchmarkCreatorProfileOutputV3Schema.parse({ kind: "CREATOR_PROFILE", schemaVersion: "benchmark-creator-profile-v3", message: cards.length ? `已根据当前 ${manifest.distillations.length} 条代表内容形成 ${cards.length} 张账号画像卡。` : "当前研究内容还不足以判断。", account: manifest.account, inputs: manifest.distillations, accountResearch: manifest.accountResearch, priorProfileVersion: manifest.priorProfileVersion, cards });
  return { output, diagnostics: { rawCardCount: input.cards.length, validCardCount: cards.length, droppedCardCount: input.cards.length - cards.length, rawClaimCount, validClaimCount, droppedClaimCount: rawClaimCount - validClaimCount } };
}

export function normalizeBenchmarkCreatorProfileV3Output(input: BenchmarkCreatorProfileGenerationV3, atoms: CreatorProfileAtom[], manifest: BenchmarkCreatorProfileInputV3): BenchmarkCreatorProfileOutputV3 {
  return normalizeBenchmarkCreatorProfileV3Result(input, atoms, manifest).output;
}

function profileFailure(error: unknown) {
  if (error instanceof LLMError) return {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    providerRequestId: error.details.providerRequestId,
    actualModel: error.details.actualModel,
    finishReason: error.details.finishReason,
    validationIssues: error.details.validationIssues,
    returnedRootKeys: error.details.returnedRootKeys,
    returnedFirstLevelObjectKeys: error.details.returnedFirstLevelObjectKeys,
    rawCandidateCount: error.details.rawCandidateCount,
    validCandidateCount: error.details.validCandidateCount,
    droppedCandidateCount: error.details.droppedCandidateCount,
    rawCardCount: error.details.rawCandidateCount,
    validCardCount: error.details.validCandidateCount,
    droppedCardCount: error.details.droppedCandidateCount,
  };
  return { code: "BENCHMARK_CREATOR_PROFILE_FAILED", message: "这次账号画像没有完成，请重试。", retryable: false };
}

type CreatorProfileJobDependencies = { runtime?: BenchmarkRuntime };

export async function processBenchmarkCreatorProfileJob(job: Job<BenchmarkStudyPayload>, dependencies: CreatorProfileJobDependencies = {}) {
  const startedAt = new Date();
  const record = await db.benchmarkStudy.findFirst({
    where: { id: job.data.studyId, workspaceId: job.data.workspaceId, createdById: job.data.requestedById },
    include: { benchmarkAccount: { select: { id: true, workspaceId: true } }, samples: { orderBy: { createdAt: "asc" }, include: { sourceItem: { select: { id: true, title: true, transcript: { select: { id: true, updatedAt: true, fullText: true, segments: true } } } } } } },
  });
  if (!record || record.benchmarkAccount.workspaceId !== record.workspaceId) throw new UnrecoverableError("Benchmark creator profile scope mismatch");
  if (record.status === "COMPLETED") return { status: "already-completed" as const, studyId: record.id };
  const manifestV3 = benchmarkCreatorProfileInputV3Schema.safeParse(record.output);
  const manifestV2 = benchmarkCreatorProfileInputV2Schema.safeParse(record.output);
  const manifestV1 = benchmarkCreatorProfileInputSchema.safeParse(record.output);
  if (!manifestV3.success && !manifestV2.success && !manifestV1.success) throw new UnrecoverableError("Benchmark creator profile input is missing");
  const manifest: BenchmarkCreatorProfileInput | BenchmarkCreatorProfileInputV2 | BenchmarkCreatorProfileInputV3 = manifestV3.success ? manifestV3.data : manifestV2.success ? manifestV2.data : manifestV1.success ? manifestV1.data : (() => { throw new UnrecoverableError("Benchmark creator profile input is missing"); })();
  const distillations = await db.materialDistillation.findMany({ where: { workspaceId: record.workspaceId, id: { in: manifest.distillations.map(({ materialDistillationId }) => materialDistillationId) }, status: "COMPLETED" } });
  const rows = manifest.distillations.flatMap((locked) => {
    const distillation = distillations.find((item) => item.id === locked.materialDistillationId && item.sourceItemId === locked.sourceItemId && item.version === locked.materialDistillationVersion);
    const sample = record.samples.find((item) => item.id === locked.sampleId && item.sourceItemId === locked.sourceItemId);
    const output = distillation ? materialDistillationGenerationSchema.safeParse(distillation.output) : null;
    const transcript = sample?.sourceItem.transcript;
    return sample && distillation && output?.success && transcript && distillation.transcriptUpdatedAtAtDistillation.getTime() === transcript.updatedAt.getTime()
      ? [{ ...locked, title: sample.sourceItem.title || "未命名内容", output: output.data, sourceIndex: buildTranscriptSourceIndex({ id: transcript.id, updatedAt: transcript.updatedAt, fullText: transcript.fullText, segments: transcript.segments }) }]
      : [];
  });
  if (rows.length !== manifest.distillations.length) throw new UnrecoverableError("Locked M7 evidence is unavailable");
  const atoms = buildCreatorProfileAtoms(rows);
  if (!atoms.length) throw new UnrecoverableError("Creator profile evidence atoms are unavailable");
  const accountResearch = manifest.accountResearch ? await db.benchmarkStudy.findFirst({ where: { id: manifest.accountResearch.studyId, workspaceId: record.workspaceId, benchmarkAccountId: record.benchmarkAccountId, version: manifest.accountResearch.version, status: "COMPLETED" }, select: { output: true } }) : null;
  const parsedResearch = accountResearch ? benchmarkAnalysisOutputSchema.safeParse(accountResearch.output) : null;
  const context = {
    action: "GENERATE_BENCHMARK_CREATOR_PROFILE",
    account: manifest.account,
    videos: rows.map((row) => ({ sampleId: row.sampleId, title: row.title, materialDistillation: { id: row.materialDistillationId, version: row.materialDistillationVersion, items: atoms.filter(({ sampleId }) => sampleId === row.sampleId).map(({ ref, itemKind, itemKey, title, text, type, quality, sourceRefs, evidence }) => ({ ref, itemKind, itemKey, title, text, sourceRefs, evidence, ...(type ? { type } : {}), ...(quality ? { quality } : {}) })) } })),
    accountResearch: parsedResearch?.success ? parsedResearch.data : null,
    priorProfile: manifestV3.success ? manifestV3.data.priorProfile : manifestV2.success ? manifestV2.data.priorProfile : null,
    cautions: [benchmarkCreatorProfileSystemBoundary, "M7 items are candidate observations. Account-level sections still require independent cross-video support."],
  };
  const prompt = `Action: GENERATE_BENCHMARK_CREATOR_PROFILE\nContext:\n${JSON.stringify(context, null, 2)}\n${manifestV3.success ? benchmarkCreatorProfileOutputV3Instruction : manifestV2.success ? benchmarkCreatorProfileOutputV2Instruction : benchmarkCreatorProfileOutputInstruction}`;
  const contextTruncated = JSON.stringify(context).length > 200_000;
  const schemaVersion = manifestV3.success ? "benchmark-creator-profile-v3" : manifestV2.success ? "benchmark-creator-profile-v2" : "benchmark-creator-profile-v1";
  const promptVersion = manifestV3.success ? 3 : manifestV2.success ? 2 : 1;
  const summary = { benchmarkStudyId: record.id, benchmarkAccountId: record.benchmarkAccountId, sampleCount: rows.length, materialDistillationIds: rows.map(({ materialDistillationId }) => materialDistillationId), accountResearchStudyId: manifest.accountResearch?.studyId ?? null, priorProfileVersion: manifestV3.success ? manifestV3.data.priorProfileVersion : manifestV2.success ? manifestV2.data.priorProfileVersion : null, schemaVersion };
  let runId: string | undefined;
  let runProvider: string | undefined;
  let requestedModel: string | undefined;
  let runMode: string | undefined;
  try {
    const runtime = dependencies.runtime ?? await loadBenchmarkRuntime(record.workspaceId);
    runProvider = runtime.providerName;
    requestedModel = runtime.requestedModel ?? runtime.model;
    runMode = runtime.mode ?? "REAL";
    const runtimeAudit = { provider: runtime.providerName, requestedModel, providerMode: runMode };
    const run = await db.$transaction(async (tx) => {
      const created = await tx.aIRun.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, action: "ANALYZE_BENCHMARK", provider: runtime.providerName, model: runtime.model, promptVersion, status: "RUNNING", inputSummary: json(summary), metadata: json({ benchmarkAction: "GENERATE_CREATOR_PROFILE", benchmarkStudyId: record.id, benchmarkAccountId: record.benchmarkAccountId, sampleCount: rows.length, schemaVersion, structuredOutput: "JSON_OBJECT", ...runtimeAudit }), contextTruncated } });
      await tx.benchmarkStudy.update({ where: { id: record.id }, data: { aiRunId: created.id, errorCode: null, errorMessage: null } });
      await tx.auditLog.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, action: "benchmark_creator_profile.started", resourceType: "benchmark_study", resourceId: record.id, metadata: json({ aiRunId: created.id, sampleCount: rows.length }) } });
      return created;
    });
    runId = run.id;
    const request = { systemPrompt: `${benchmarkCreatorProfileSystemBoundary}\n\n${generationQualityContract}`, prompt, maxCompletionTokens: 3_500, structuredOutput: { strategy: "JSON_OBJECT" as const } };
    const result = manifestV3.success
      ? await runtime.provider.generateStructured(request, benchmarkCreatorProfileGenerationV3Schema)
      : manifestV2.success
        ? await runtime.provider.generateStructured(request, benchmarkCreatorProfileGenerationV2Schema)
        : await runtime.provider.generateStructured(request, benchmarkCreatorProfileGenerationSchema);
    const normalized = manifestV3.success
      ? normalizeBenchmarkCreatorProfileV3Result(result.data.value as BenchmarkCreatorProfileGenerationV3, atoms, manifestV3.data)
      : manifestV2.success
        ? normalizeBenchmarkCreatorProfileV2Result(result.data.value as BenchmarkCreatorProfileGenerationV2, atoms, manifestV2.data)
        : normalizeBenchmarkCreatorProfileResult(result.data.value as BenchmarkCreatorProfileGeneration, atoms, manifest as BenchmarkCreatorProfileInput);
    const output = normalized.output;
    const candidateDiagnostics = normalized.diagnostics;
    const latencyMs = Date.now() - startedAt.getTime();
    await db.$transaction([
      db.aIRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", outputJson: json(output), metadata: json({ benchmarkAction: "GENERATE_CREATOR_PROFILE", benchmarkStudyId: record.id, benchmarkAccountId: record.benchmarkAccountId, sampleCount: rows.length, schemaVersion, structuredOutput: "JSON_OBJECT", ...candidateDiagnostics, ...runtimeAudit, actualModel: result.data.model, finishReason: result.data.finishReason ?? null }), providerRequestId: result.data.providerRequestId, inputTokens: result.data.usage?.inputTokens, outputTokens: result.data.usage?.outputTokens, finishedAt: new Date() } }),
      db.benchmarkStudy.update({ where: { id: record.id }, data: { status: "COMPLETED", output: json(output), errorCode: null, errorMessage: null } }),
      db.apiUsage.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, provider: runtime.providerName, operation: "GENERATE_BENCHMARK_CREATOR_PROFILE", requestId: run.id, providerRequestId: result.data.providerRequestId, success: true, units: 1, cost: null, inputTokens: result.data.usage?.inputTokens, outputTokens: result.data.usage?.outputTokens, metadata: json({ airRunId: run.id, benchmarkStudyId: record.id, sampleCount: rows.length, promptVersion, latencyMs, ...candidateDiagnostics, ...runtimeAudit, actualModel: result.data.model, finishReason: result.data.finishReason ?? null }) } }),
      db.auditLog.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, action: "benchmark_creator_profile.succeeded", resourceType: "benchmark_study", resourceId: record.id, metadata: json({ sampleCount: rows.length, cardCount: "cards" in output ? output.cards.length : output.sections.length, ...candidateDiagnostics }) } }),
    ]);
    return { status: "ok" as const, studyId: record.id, sampleCount: rows.length };
  } catch (error) {
    const failed = profileFailure(error);
    const diagnostics = { structuredOutput: "JSON_OBJECT", requestedModel: requestedModel ?? null, actualModel: failed.actualModel ?? null, finishReason: failed.finishReason ?? null, validationIssues: failed.validationIssues ?? [], returnedRootKeys: failed.returnedRootKeys ?? [], returnedFirstLevelObjectKeys: failed.returnedFirstLevelObjectKeys ?? {}, rawCandidateCount: failed.rawCandidateCount ?? null, validCandidateCount: failed.validCandidateCount ?? null, droppedCandidateCount: failed.droppedCandidateCount ?? null, rawCardCount: failed.rawCardCount ?? null, validCardCount: failed.validCardCount ?? null, droppedCardCount: failed.droppedCardCount ?? null };
    if (runId) {
      await db.aIRun.update({ where: { id: runId }, data: { status: "FAILED", errorCode: failed.code, errorMessage: "账号画像未完成。", providerRequestId: failed.providerRequestId, metadata: json({ benchmarkAction: "GENERATE_CREATOR_PROFILE", benchmarkStudyId: record.id, benchmarkAccountId: record.benchmarkAccountId, sampleCount: rows.length, schemaVersion, provider: runProvider ?? "LLM", providerMode: runMode ?? "REAL", ...diagnostics }), finishedAt: new Date() } }).catch(() => undefined);
      await db.apiUsage.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, provider: runProvider ?? "LLM", operation: "GENERATE_BENCHMARK_CREATOR_PROFILE", requestId: runId, providerRequestId: failed.providerRequestId, success: false, units: 1, cost: null, metadata: json({ airRunId: runId, benchmarkStudyId: record.id, errorCode: failed.code, ...diagnostics }) } }).catch(() => undefined);
    }
    const attempt = job.attemptsMade + 1;
    const willRetry = failed.retryable && attempt < 3;
    await db.benchmarkStudy.update({ where: { id: record.id }, data: { status: willRetry ? "PROCESSING" : "FAILED", errorCode: failed.code, errorMessage: willRetry ? null : failed.message } }).catch(() => undefined);
    await db.auditLog.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, action: "benchmark_creator_profile.failed", resourceType: "benchmark_study", resourceId: record.id, metadata: json({ sampleCount: rows.length, attempt, retrying: willRetry, errorCode: failed.code, ...diagnostics }) } }).catch(() => undefined);
    if (!failed.retryable) throw new UnrecoverableError(`${failed.code}: ${failed.message}`);
    throw error;
  }
}
