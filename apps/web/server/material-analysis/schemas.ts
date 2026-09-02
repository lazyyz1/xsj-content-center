import { z } from "zod";

const concise = (maximum: number) => z.string().trim().min(1).max(maximum);

const reusableItem = z.object({ content: concise(500), whyUseful: concise(500) }).strict();
const cautionItem = z.object({ content: concise(500), reason: concise(500) }).strict();

export const materialAnalysisOutputSchema = z.object({
  whatItSays: z.object({ summary: concise(800), keyPoints: z.array(concise(500)).max(12) }).strict(),
  reusable: z.array(reusableItem).max(12),
  doNotCopy: z.array(cautionItem).max(12),
  uncertain: z.array(cautionItem).max(12),
}).strict();

export const materialAnalysisEditSchema = materialAnalysisOutputSchema;
export type MaterialAnalysisOutput = z.infer<typeof materialAnalysisOutputSchema>;

export const materialAnalysisOutputInstruction = `
Return exactly one JSON object with these fields and no additional fields:
{
  "whatItSays": { "summary": "string", "keyPoints": ["string"] },
  "reusable": [{ "content": "string", "whyUseful": "string" }],
  "doNotCopy": [{ "content": "string", "reason": "string" }],
  "uncertain": [{ "content": "string", "reason": "string" }]
}
Do not return legacy classification fields, hooks, structures, drafts, or markdown.`;
