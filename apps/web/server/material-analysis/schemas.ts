import { z } from "zod";

const concise = (maximum: number) => z.string().trim().min(1).max(maximum);

export const materialAnalysisOutputSchema = z.object({
  suggestedTitle: concise(120),
  summary: concise(600),
  topic: concise(120),
  tags: z.array(concise(30)).min(1).max(8),
  keywords: z.array(concise(40)).min(1).max(10),
  contentType: concise(80),
  targetAudience: concise(240),
  coreViewpoint: concise(600),
  keyPoints: z.array(concise(300)).min(1).max(6),
  coreQuestion: concise(300),
}).strict();

export const materialAnalysisEditSchema = materialAnalysisOutputSchema;
export type MaterialAnalysisOutput = z.infer<typeof materialAnalysisOutputSchema>;

export const materialAnalysisOutputInstruction = `
Return exactly one JSON object with these fields and no additional fields:
{
  "suggestedTitle": "string, <= 120 characters",
  "summary": "string, <= 600 characters",
  "topic": "string, <= 120 characters",
  "tags": ["1 to 8 concise tags"],
  "keywords": ["1 to 10 concise keywords"],
  "contentType": "string, <= 80 characters",
  "targetAudience": "string, <= 240 characters",
  "coreViewpoint": "string, <= 600 characters",
  "keyPoints": ["1 to 6 material takeaways"],
  "coreQuestion": "string, <= 300 characters"
}
Do not return hooks, structure, argumentFlow, goldenLines, CTA, repurpose modes, drafts, or markdown.`;
