import { describe, expect, it } from "vitest";
import { getSourceProcessingState } from "../lib/source-processing-state";

const storedVideo = { assetType: "VIDEO", status: "STORED" } as const;
const storedAudio = { assetType: "AUDIO", status: "STORED" } as const;
const redfoxSucceeded = { jobType: "PROCESS_MEDIA", provider: "REDFOX", status: "SUCCEEDED" } as const;

describe("getSourceProcessingState", () => {
  it("reports saved video with unconfigured ASR without changing READY semantics", () => {
    expect(getSourceProcessingState({
      sourceStatus: "READY",
      transcriptionStatus: "UNCONFIGURED",
      hasTranscript: false,
      assets: [storedVideo],
      jobs: [redfoxSucceeded],
    })).toMatchObject({
      transcription: "NOT_CONFIGURED",
      libraryLabel: "已保存 · 待转写",
      steps: { redfoxParse: "SUCCEEDED", videoSave: "SUCCEEDED", audioExtraction: "SKIPPED", aiTranscription: "SKIPPED" },
    });
  });

  it("maps queued, audio extraction and transcription progress explicitly", () => {
    const base = { sourceStatus: "READY", transcriptionStatus: "CONFIGURED", hasTranscript: false, assets: [storedVideo], jobs: [redfoxSucceeded] } as const;
    expect(getSourceProcessingState(base).transcription).toBe("NOT_STARTED");
    expect(getSourceProcessingState({ ...base, jobs: [{ jobType: "TRANSCRIBE", provider: "DOUBAO_ASR", status: "QUEUED" }, ...base.jobs] }).transcription).toBe("QUEUED");
    expect(getSourceProcessingState({ ...base, jobs: [{ jobType: "TRANSCRIBE", provider: "DOUBAO_ASR", status: "RUNNING", metadata: { progressStage: "EXTRACTING_AUDIO" } }, ...base.jobs] }).transcription).toBe("EXTRACTING_AUDIO");
    expect(getSourceProcessingState({ ...base, assets: [storedVideo, storedAudio], jobs: [{ jobType: "TRANSCRIBE", provider: "DOUBAO_ASR", status: "RUNNING", metadata: { progressStage: "TRANSCRIBING" } }, ...base.jobs] })).toMatchObject({
      transcription: "TRANSCRIBING",
      steps: { audioExtraction: "SUCCEEDED", aiTranscription: "PROCESSING" },
      libraryLabel: "已保存",
    });
    expect(getSourceProcessingState({
      ...base,
      hasTranscript: true,
      assets: [storedVideo, storedAudio],
      jobs: [{ jobType: "TRANSCRIBE", provider: "DOUBAO_ASR", status: "SUCCEEDED" }, ...base.jobs],
    })).toMatchObject({ transcription: "SUCCEEDED", transcriptionLabel: "已完成", libraryLabel: "已转写" });
  });

  it("keeps an old transcript visible while exposing the latest retry failure", () => {
    expect(getSourceProcessingState({
      sourceStatus: "READY",
      transcriptionStatus: "CONFIGURED",
      hasTranscript: true,
      assets: [storedVideo, storedAudio],
      jobs: [{ jobType: "TRANSCRIBE", provider: "DOUBAO_ASR", status: "FAILED" }, redfoxSucceeded],
    })).toMatchObject({
      transcription: "FAILED",
      libraryLabel: "已转写",
      steps: { videoSave: "SUCCEEDED", audioExtraction: "SUCCEEDED", aiTranscription: "FAILED" },
    });
  });
});
