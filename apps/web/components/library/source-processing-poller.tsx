"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 2_500;
const BACKGROUND_INTERVAL_MS = 5_000;
const HARD_REFRESH_AFTER_MS = 10_000;
const REQUEST_TIMEOUT_MS = 12_000;

export type SourceProcessingSnapshot = {
  busy: boolean;
  fingerprint: string;
  transcriptionStatus: string | null;
  hasTranscript: boolean;
  transcriptUpdatedAt: string | null;
  transcription: {
    status: string;
    progress: number;
    stage: string | null;
    errorMessage: string | null;
  } | null;
};

export function SourceProcessingPoller({ sourceId, active, onSnapshot }: {
  sourceId: string;
  active: boolean;
  onSnapshot?: (snapshot: SourceProcessingSnapshot) => void;
}) {
  const router = useRouter();
  const callback = useRef(onSnapshot);
  const [disconnected,setDisconnected]=useState(false);
  useEffect(() => { callback.current = onSnapshot; }, [onSnapshot]);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let inFlight = false;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    let fingerprint: string | null = null;
    let terminalSince: number | null = null;

    const schedule = () => {
      if (!stopped) timer = window.setTimeout(() => void poll(), document.visibilityState === "hidden" ? BACKGROUND_INTERVAL_MS : POLL_INTERVAL_MS);
    };
    const poll = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`/api/source-items/${sourceId}/processing`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) { setDisconnected(true); return; }
        setDisconnected(false);
        const snapshot = await response.json() as SourceProcessingSnapshot;
        callback.current?.(snapshot);
        const changed = fingerprint !== null && fingerprint !== snapshot.fingerprint;
        fingerprint = snapshot.fingerprint;
        if (snapshot.busy) {
          terminalSince = null;
          if (changed) router.refresh();
        } else {
          terminalSince ??= Date.now();
          router.refresh();
          // A route refresh can be dropped while the tab is in the background.
          // Continue polling until the server-rendered view catches up.
          if (Date.now() - terminalSince >= HARD_REFRESH_AFTER_MS) {
            stopped = true;
            window.location.reload();
          }
        }
      } catch {
        if (!stopped) setDisconnected(true);
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
        if (!stopped) schedule();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" || stopped || inFlight) return;
      if (timer !== undefined) window.clearTimeout(timer);
      void poll();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onVisibilityChange);
    void poll();
    return () => {
      stopped = true;
      controller?.abort();
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onVisibilityChange);
    };
  }, [active, router, sourceId]);

  return active && disconnected ? <p role="status">连接暂时中断，正在重新连接；后台任务可能仍在处理。</p> : null;
}
