import { describe, expect, it } from "vitest";
import { validateWorkDecisionPass, validateWorkDeepAnswer, validateWorkDeepAnswerV2 } from "../server/research/work-research-analysis";
import { sampleAnswer, sampleAnswerV2, sampleBody, sampleDecisionPass, sampleEvidence } from "./work-research-fixture";
import {sameWorkEvidence} from "../server/research/work-research-contract";

describe("single-work dynamic deep analysis", () => {
  it("treats refreshed observation timestamps as unchanged facts while detecting actual metric and text changes",()=>{
   expect(sameWorkEvidence(sampleEvidence,{...sampleEvidence,observedAt:"2026-10-08T00:00:00Z",capturedAt:"2026-10-08T00:00:00Z",fingerprint:"c".repeat(64)})).toBe(true);
   expect(sameWorkEvidence(sampleEvidence,{...sampleEvidence,metrics:{...sampleEvidence.metrics,likes:37}})).toBe(false);
   expect(sameWorkEvidence(sampleEvidence,{...sampleEvidence,contentText:sampleBody+"新增内容"})).toBe(false);
  });
  it("adds report summaries and mainline observations without rewriting literal source",()=>{const pass=sampleDecisionPass();pass.structureReview=[{order:1,label:"设问",summary:"提出用户正在面对的问题。",mainlineRelation:"SERVES",mainlineReason:"建立这条内容讨论的问题",citation:{ref:"M1",quote:"先展示用户的真实问题"}}];const result=validateWorkDecisionPass(pass,sampleAnswer(),sampleEvidence);expect(result.structureBlocks[0]!.display?.summary).toBe("提出用户正在面对的问题。");expect(result.structureBlocks[0]!.content).toBe(sampleAnswer().structureBlocks[0]!.content);});
  it("rejects mainline observations borrowed from a different paragraph",()=>{const pass=sampleDecisionPass();pass.structureReview=[{order:1,label:"案例",summary:"说明结果",mainlineRelation:"DETOUR",mainlineReason:"偏离主线",citation:{ref:"M1",quote:"最后解释结果如何用于自己"}}];expect(()=>validateWorkDecisionPass(pass,sampleAnswer(),sampleEvidence)).toThrow("WORK_STRUCTURE_REVIEW_QUOTE_MISMATCH");});
  it("requires a complete reading review for newly generated reports while keeping old saved decisions readable",()=>{const pass=sampleDecisionPass();pass.structureReview=[];expect(()=>validateWorkDecisionPass(pass,sampleAnswer(),sampleEvidence,{requireReading:true})).toThrow("WORK_STRUCTURE_REVIEW_INCOMPLETE");expect(()=>validateWorkDecisionPass(pass,sampleAnswer(),sampleEvidence)).not.toThrow();});
  it("accepts dynamic blocks with actual transcript timecodes and grounded mechanisms", () => {
    expect(validateWorkDeepAnswer(sampleAnswer(), sampleEvidence).structureBlocks).toHaveLength(3);
  });
  it("rejects invented excerpts and invented timecodes", () => {
    const quote = sampleAnswer(); quote.structureBlocks[0]!.citation.quote = "作品完全没说的话";
    expect(() => validateWorkDeepAnswer(quote, sampleEvidence)).toThrow("WORK_QUOTE_NOT_IN_SNAPSHOT");
    const time = sampleAnswer(); time.structureBlocks[0]!.startMs = 12000; time.structureBlocks[0]!.endMs = 18000;
    expect(() => validateWorkDeepAnswer(time, sampleEvidence)).toThrow("WORK_TIMECODE_NOT_IN_SNAPSHOT");
  });
  it("keeps absent mechanisms absent and refuses made-up performance numbers", () => {
    const noProof = sampleAnswer(); noProof.mechanisms = noProof.mechanisms.filter(item => item.kind !== "PROOF");
    expect(validateWorkDeepAnswer(noProof, sampleEvidence).mechanisms).toHaveLength(1);
    const invented = sampleAnswer(); invented.summary = "这条内容带来999999次转化";
    expect(() => validateWorkDeepAnswer(invented, sampleEvidence)).toThrow("WORK_UNSUPPORTED_NUMBER");
  });
  it("distinguishes missing evidence in a transcript from a claim that the video contains no visual proof", () => {
    const answer = sampleAnswer();
    answer.mechanisms[0]!.description = "作品中没有出现付款记录、聊天截图或家长本人的出镜说法。";
    expect(() => validateWorkDeepAnswer(answer, sampleEvidence)).toThrow("WORK_VISUAL_ABSENCE_UNVERIFIED");
    answer.mechanisms[0]!.description = "当前文字资料未提供付款记录或聊天截图，不能核实口述结果。";
    expect(() => validateWorkDeepAnswer(answer, sampleEvidence)).not.toThrow();
  });
  it("validates decision citations, audience journey and transcript-only visual limits", () => {
    expect(validateWorkDeepAnswerV2(sampleAnswerV2(), sampleEvidence).decision.audienceRoles[0]?.relation).toBe("VIEWER");
    const citation = sampleAnswerV2(); citation.decision.strengths[0]!.citation.quote = "作品没说这句话";
    expect(() => validateWorkDeepAnswerV2(citation, sampleEvidence)).toThrow("WORK_QUOTE_NOT_IN_SNAPSHOT");
    const journey = sampleAnswerV2(); journey.decision.audienceJourney[0]!.afterBlock = 9;
    expect(() => validateWorkDeepAnswerV2(journey, sampleEvidence)).toThrow("WORK_JOURNEY_BLOCK_INVALID");
    const visual = sampleAnswerV2(); visual.decision.packaging.coverOrVisual = "封面写了教程";
    expect(() => validateWorkDeepAnswerV2(visual, sampleEvidence)).toThrow("WORK_VISUAL_EVIDENCE_MISSING");
  });
  it("keeps ASR display corrections separate from immutable source text", () => {
    const corrected = sampleAnswerV2(); corrected.decision.displayCorrections = [{ original: "操作", display: "演示", reason: "疑似转写误识别", citation: { ref: "M1", quote: "接着演示操作" } }];
    expect(validateWorkDeepAnswerV2(corrected, sampleEvidence).decision.displayCorrections).toHaveLength(1);
    expect(sampleEvidence.contentText).toBe(sampleBody);
    const invented = sampleAnswerV2(); invented.decision.displayCorrections = [{ original: "不存在", display: "演示", reason: "猜测", citation: { ref: "M1", quote: "接着演示操作" } }];
    expect(() => validateWorkDeepAnswerV2(invented, sampleEvidence)).toThrow("WORK_DISPLAY_CORRECTION_UNGROUNDED");
  });
  it("separates source limitations from work weaknesses and drops invalid block pointers", () => {
    const asr = sampleAnswerV2(); asr.decision.weaknesses[0]!.finding = "机器转写有识别错误";
    expect(() => validateWorkDeepAnswerV2(asr, sampleEvidence)).toThrow("WORK_SOURCE_LIMIT_IS_NOT_CONTENT_WEAKNESS");
    const pass = sampleDecisionPass(); pass.weaknesses[0]!.finding = "机器转写有识别错误";
    pass.audienceJourney[0]!.afterBlock = 9;
    const result = validateWorkDecisionPass(pass, sampleAnswer(), sampleEvidence);
    expect(result.decision.weaknesses).toHaveLength(0);
    expect(result.decision.audienceJourney).toHaveLength(0);
    expect(result.decision.researchLimits.join(" ")).toContain("机器转写");
  });
});
