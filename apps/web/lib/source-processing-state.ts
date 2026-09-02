export type ProcessingStepState = "WAITING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "SKIPPED";

export type TranscriptionState =
  | "NOT_CONFIGURED"
  | "NOT_STARTED"
  | "QUEUED"
  | "EXTRACTING_AUDIO"
  | "TRANSCRIBING"
  | "SUCCEEDED"
  | "FAILED";

type SourceProcessingInput = {
  sourceStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED" | "ARCHIVED";
  transcriptionStatus?: "UNCONFIGURED" | "CONFIGURED" | "DISABLED" | "MOCK" | "ERROR";
  hasTranscript: boolean;
  assets: ReadonlyArray<{ assetType: "VIDEO" | "IMAGE" | "AUDIO"; status: "REMOTE" | "DOWNLOADING" | "STORED" | "FAILED" }>;
  jobs: ReadonlyArray<{
    jobType: string;
    provider: string;
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
    metadata?: unknown;
  }>;
};

export const transcriptionStateLabels: Record<TranscriptionState, string> = {
  NOT_CONFIGURED: "未配置",
  NOT_STARTED: "未开始",
  QUEUED: "等待转写",
  EXTRACTING_AUDIO: "正在提取音频",
  TRANSCRIBING: "正在转写",
  SUCCEEDED: "已完成",
  FAILED: "转写失败",
};

function progressStage(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const stage = (metadata as Record<string, unknown>).progressStage;
  return typeof stage === "string" ? stage : undefined;
}

export function getSourceProcessingState(input: SourceProcessingInput) {
  const redfoxJob = input.jobs.find((job) => job.provider === "REDFOX" && job.jobType === "PROCESS_MEDIA");
  const transcriptionJob = input.jobs.find((job) => job.jobType === "TRANSCRIBE");
  const storedVideo = input.assets.some((asset) => asset.assetType === "VIDEO" && asset.status === "STORED");
  const storedPrimaryMedia = input.assets.some((asset) => (asset.assetType === "VIDEO" || asset.assetType === "IMAGE") && asset.status === "STORED");
  const failedPrimaryMedia = input.assets.some((asset) => (asset.assetType === "VIDEO" || asset.assetType === "IMAGE") && asset.status === "FAILED");
  const storedAudio = input.assets.some((asset) => asset.assetType === "AUDIO" && asset.status === "STORED");
  const failedAudio = input.assets.some((asset) => asset.assetType === "AUDIO" && asset.status === "FAILED");
  const transcriptionConfigured = input.transcriptionStatus === "CONFIGURED";
  const stage = progressStage(transcriptionJob?.metadata);

  let transcription: TranscriptionState;
  if (transcriptionJob?.status === "FAILED") transcription = "FAILED";
  else if (transcriptionJob?.status === "QUEUED") transcription = "QUEUED";
  else if (transcriptionJob?.status === "RUNNING" && (stage === "EXTRACTING_AUDIO" || stage === "UPLOADING_AUDIO")) transcription = "EXTRACTING_AUDIO";
  else if (transcriptionJob?.status === "RUNNING") transcription = "TRANSCRIBING";
  else if (transcriptionJob?.status === "SUCCEEDED" || input.hasTranscript) transcription = "SUCCEEDED";
  else if (!transcriptionConfigured) transcription = "NOT_CONFIGURED";
  else transcription = "NOT_STARTED";

  const redfoxParse: ProcessingStepState = redfoxJob?.status === "FAILED"
    ? "FAILED"
    : redfoxJob?.status === "RUNNING"
      ? "PROCESSING"
      : redfoxJob?.status === "SUCCEEDED" || storedPrimaryMedia
        ? "SUCCEEDED"
        : redfoxJob?.status === "CANCELLED"
          ? "SKIPPED"
          : "WAITING";

  const videoSave: ProcessingStepState = storedPrimaryMedia
    ? "SUCCEEDED"
    : failedPrimaryMedia
      ? "FAILED"
      : redfoxParse === "FAILED" || redfoxParse === "SKIPPED"
        ? "SKIPPED"
        : redfoxJob?.status === "RUNNING"
          ? "PROCESSING"
          : "WAITING";

  const audioExtraction: ProcessingStepState = storedAudio
    ? "SUCCEEDED"
    : transcription === "EXTRACTING_AUDIO"
      ? "PROCESSING"
      : transcription === "TRANSCRIBING" || transcription === "SUCCEEDED"
        ? "SUCCEEDED"
    : !transcriptionConfigured || videoSave === "FAILED" || videoSave === "SKIPPED"
      ? "SKIPPED"
      : failedAudio || (transcription === "FAILED" && !storedAudio)
        ? "FAILED"
        : "WAITING";

  const aiTranscription: ProcessingStepState = transcription === "FAILED"
      ? "FAILED"
      : transcription === "SUCCEEDED"
        ? "SUCCEEDED"
        : transcription === "QUEUED" || transcription === "TRANSCRIBING" || transcription === "EXTRACTING_AUDIO"
          ? "PROCESSING"
        : !transcriptionConfigured || videoSave === "FAILED" || videoSave === "SKIPPED"
          ? "SKIPPED"
          : "WAITING";

  const libraryLabel = storedVideo
    ? input.hasTranscript
      ? "已转写"
      : transcription === "QUEUED" || transcription === "EXTRACTING_AUDIO" || transcription === "TRANSCRIBING"
        ? "已保存"
        : "已保存 · 待转写"
    : input.sourceStatus === "FAILED"
      ? "失败"
      : "处理中";

  return {
    steps: { redfoxParse, videoSave, audioExtraction, aiTranscription },
    transcription,
    transcriptionLabel: transcriptionStateLabels[transcription],
    libraryLabel,
    busy: input.sourceStatus === "PENDING" || input.sourceStatus === "PROCESSING" || transcription === "QUEUED" || transcription === "EXTRACTING_AUDIO" || transcription === "TRANSCRIBING",
  };
}
