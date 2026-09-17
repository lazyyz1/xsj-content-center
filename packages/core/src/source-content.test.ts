import { describe, expect, it } from "vitest";
import { resolveSourceContent } from "./source-content";

const sourceUpdatedAt = new Date("2026-09-17T00:00:00.000Z");
const transcriptUpdatedAt = new Date("2026-09-17T00:01:00.000Z");

describe("resolveSourceContent", () => {
  it("uses Transcript for video and audio", () => {
    expect(resolveSourceContent({ sourceType: "VIDEO", rawText: null, sourceUpdatedAt, transcript: { id: "t1", fullText: "spoken", segments: [{ text: "spoken" }], updatedAt: transcriptUpdatedAt } })).toMatchObject({ contentText: "spoken", contentSource: "TRANSCRIPT", transcriptId: "t1", updatedAt: transcriptUpdatedAt });
    expect(resolveSourceContent({ sourceType: "AUDIO", rawText: null, sourceUpdatedAt, transcript: { id: "t2", fullText: "audio", segments: [], updatedAt: transcriptUpdatedAt } })).toMatchObject({ contentText: "audio", contentSource: "TRANSCRIPT" });
  });

  it("uses extracted text for text-like sources without fabricating a transcript", () => {
    expect(resolveSourceContent({ sourceType: "DOCUMENT", rawText: "pdf body", sourceUpdatedAt, transcript: null })).toMatchObject({ contentText: "pdf body", contentSource: "EXTRACTED_TEXT", transcriptId: null, updatedAt: sourceUpdatedAt, segments: [] });
    expect(resolveSourceContent({ sourceType: "URL", rawText: "article body", sourceUpdatedAt, transcript: { id: "legacy", fullText: "legacy wrapper", segments: [], updatedAt: transcriptUpdatedAt } })).toMatchObject({ contentText: "article body", contentSource: "EXTRACTED_TEXT", transcriptId: null, updatedAt: sourceUpdatedAt });
  });

  it("returns null when no readable content exists", () => {
    expect(resolveSourceContent({ sourceType: "TEXT", rawText: "  ", sourceUpdatedAt, transcript: null })).toBeNull();
    expect(resolveSourceContent({ sourceType: "IMAGE", rawText: null, sourceUpdatedAt, transcript: null })).toBeNull();
  });
});
