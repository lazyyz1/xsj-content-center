export type ExternalCallPurpose = "GENERAL" | "LLM" | "RESEARCH_COLLECTION";
/** A daily model-only opt-in never enables collection, transcription, review or build traffic. */
export function isLocalReviewOffline(purpose: ExternalCallPurpose = "GENERAL") {
  if (process.env.ENVIRONMENT_ID === "LOCAL_REVIEW" || process.env.ENVIRONMENT_ID === "LOCAL_BUILD" || process.env.LOCAL_REVIEW_OFFLINE === "true") return true;
  if (process.env.EXTERNAL_CALLS_DISABLED !== "true") return false;
  const daily = process.env.ENVIRONMENT_ID === "LOCAL_REAL" && process.env.LOCAL_RELEASE_PROFILE === "daily";
  return !(daily && (purpose === "LLM" && process.env.LOCAL_LLM_ENABLED === "true" || purpose === "RESEARCH_COLLECTION" && process.env.LOCAL_RESEARCH_COLLECTION_ENABLED === "true"));
}

export function assertReviewExternalAllowed(purpose: ExternalCallPurpose = "GENERAL") {
  if (isLocalReviewOffline(purpose)) throw new Error("LOCAL_REVIEW_EXTERNAL_CALL_BLOCKED");
}
