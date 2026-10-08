import { describe, expect, it } from "vitest";
import { validateWorkDeepAnswer } from "../server/research/work-research-analysis";
import { sampleAnswer, sampleEvidence } from "./work-research-fixture";
describe("transcription evidence regressions", () => {
 it("accepts a real quote spanning adjacent ASR sentences", () => {
  const answer=sampleAnswer(); answer.structureBlocks[0]!.content="先展示用户的真实问题。接着演示操作。";
  answer.structureBlocks[0]!.citation.quote=answer.structureBlocks[0]!.content; answer.structureBlocks[0]!.endMs=12000;
  expect(validateWorkDeepAnswer(answer,sampleEvidence).structureBlocks[0]!.endMs).toBe(12000);
 });
 it("rejects an invented timestamp even when a quote occurs elsewhere",()=>{
  const answer=sampleAnswer();answer.structureBlocks[0]!.startMs=12000;answer.structureBlocks[0]!.endMs=18000;
  expect(()=>validateWorkDeepAnswer(answer,sampleEvidence)).toThrow("WORK_TIMECODE_NOT_IN_SNAPSHOT");
 });
});

describe("timecode boundaries",()=>{it("rejects fabricated time inside a known ASR sentence",()=>{
 const answer=sampleAnswer();answer.structureBlocks[0]!.startMs=500;
 expect(()=>validateWorkDeepAnswer(answer,sampleEvidence)).toThrow("WORK_TIMECODE_NOT_IN_SNAPSHOT");
});});
