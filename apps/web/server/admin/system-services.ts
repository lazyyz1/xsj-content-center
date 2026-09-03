import "server-only";

import { getSystemProviderConfig, resolveSystemProviderConfig, systemManagedProvidersEnabled } from "@content-center/integrations";

const configured = (...names: string[]) => names.every((name) => Boolean(process.env[name]?.trim()));

async function localFunAsrStatus() {
  const baseUrl = process.env.LOCAL_ASR_ENDPOINT?.trim() || "http://127.0.0.1:8765";
  try {
    const response = await fetch(new URL("/health", `${baseUrl.replace(/\/$/, "")}/`), {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok ? "AVAILABLE" as const : "UNAVAILABLE" as const;
  } catch {
    return "UNAVAILABLE" as const;
  }
}

export async function getSystemServiceStatuses() {
  return {
    policy: systemManagedProvidersEnabled() ? "ENV_MANAGED" as const : "WORKSPACE_MANAGED" as const,
    kimi: getSystemProviderConfig("LLM") ? "CONFIGURED" as const : "UNCONFIGURED" as const,
    redfox: getSystemProviderConfig("REDFOX") ? "CONFIGURED" as const : "UNCONFIGURED" as const,
    doubao: (await resolveSystemProviderConfig("DOUBAO_ASR")) ? "CONFIGURED" as const : "UNCONFIGURED" as const,
    localFunAsr: await localFunAsrStatus(),
    storage: configured("S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY")
      ? "CONFIGURED" as const
      : "UNCONFIGURED" as const,
    developmentPrimary: "LOCAL_FUNASR" as const,
    productionPrimary: "DOUBAO_RECORDING_FILE_2_0" as const,
  };
}
