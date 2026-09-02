import { z } from "zod";

export const UNIFIED_CREATIVE_ANALYSIS_SCHEMA_VERSION = "unified-creative-analysis-v1" as const;

const sourceIds = z.array(z.string().min(1)).max(100).default([]);
const aiInterpretation = z.object({ text: z.string().min(1).max(10_000), classification: z.literal("AI_INTERPRETATION"), sourceItemIds: sourceIds }).strict();

export const unifiedCreativeAnalysisAdvisorySchema = z.object({
  creativeInterpretation: aiInterpretation,
  angles: z.array(z.object({ title: z.string().min(1).max(2_000), angle: z.string().min(1).max(5_000), rationale: z.string().min(1).max(5_000), classification: z.literal("AI_SUGGESTION"), sourceItemIds: sourceIds }).strict()).min(1).max(6),
  structure: z.object({
    overallApproach: z.string().min(1).max(5_000),
    classification: z.literal("AI_SUGGESTION"),
    sourceItemIds: sourceIds,
    sections: z.array(z.object({ title: z.string().min(1).max(2_000), purpose: z.string().min(1).max(5_000), keyMessage: z.string().min(1).max(10_000), supportingPoints: z.array(z.string().min(1).max(5_000)).max(20), sourceItemIds: sourceIds }).strict()).min(1).max(12),
  }).strict(),
  expressionDirection: z.object({ description: z.string().min(1).max(5_000), rationale: z.string().min(1).max(5_000), classification: z.literal("AI_SUGGESTION"), sourceItemIds: sourceIds }).strict(),
  riskNotes: z.array(aiInterpretation).max(20),
  titleReferences: z.array(z.object({ title: z.string().min(1).max(2_000), rationale: z.string().max(5_000), classification: z.literal("AI_SUGGESTION"), sourceItemIds: sourceIds }).strict()).min(1).max(10),
}).strict();

const sourceUnderstanding = z.object({ text: z.string().max(10_000), classification: z.enum(["SOURCE_FACT", "USER_INPUT"]), sourceItemIds: sourceIds }).strict();

export const unifiedCreativeAnalysisOutputSchema = z.object({
  schemaVersion: z.literal(UNIFIED_CREATIVE_ANALYSIS_SCHEMA_VERSION),
  summary: sourceUnderstanding,
  coreQuestion: sourceUnderstanding,
  coreViewpoint: sourceUnderstanding,
  keyPoints: z.array(sourceUnderstanding).max(100),
  creativeInterpretation: aiInterpretation,
  angles: unifiedCreativeAnalysisAdvisorySchema.shape.angles,
  structure: unifiedCreativeAnalysisAdvisorySchema.shape.structure,
  expressionDirection: unifiedCreativeAnalysisAdvisorySchema.shape.expressionDirection,
  riskNotes: unifiedCreativeAnalysisAdvisorySchema.shape.riskNotes,
  titleReferences: unifiedCreativeAnalysisAdvisorySchema.shape.titleReferences,
  sourceReferences: z.array(z.object({ sourceItemId: z.string().min(1), title: z.string().nullable(), role: z.string().min(1) }).strict()).max(100),
  groundingGaps: z.array(z.literal("SOURCE_REFERENCE_GAP")).max(1),
}).strict();

export type UnifiedCreativeAnalysisAdvisory = z.infer<typeof unifiedCreativeAnalysisAdvisorySchema>;
export type UnifiedCreativeAnalysisOutput = z.infer<typeof unifiedCreativeAnalysisOutputSchema>;

export const unifiedCreativeAnalysisOutputInstruction = `
Return exactly one JSON object matching this advisory shape. Do not use markdown fences:
{
  "creativeInterpretation":{"text":string,"classification":"AI_INTERPRETATION","sourceItemIds":string[]},
  "angles":[{"title":string,"angle":string,"rationale":string,"classification":"AI_SUGGESTION","sourceItemIds":string[]}],
  "structure":{"overallApproach":string,"classification":"AI_SUGGESTION","sourceItemIds":string[],"sections":[{"title":string,"purpose":string,"keyMessage":string,"supportingPoints":string[],"sourceItemIds":string[]}]},
  "expressionDirection":{"description":string,"rationale":string,"classification":"AI_SUGGESTION","sourceItemIds":string[]},
  "riskNotes":[{"text":string,"classification":"AI_INTERPRETATION","sourceItemIds":string[]}],
  "titleReferences":[{"title":string,"rationale":string,"classification":"AI_SUGGESTION","sourceItemIds":string[]}]
}`;
