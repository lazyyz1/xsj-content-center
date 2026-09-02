"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 2_500;

type ProcessingSnapshot = {
  busy: boolean;
  fingerprint: string;
};

export function SourceProcessingPoller({ sourceId, active }: { sourceId: string; active: boolean }) {
  const router = useRouter();
  const fingerprint = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: number | undefined;
    let controller: AbortController | undefined;

    const schedule = () => {
      if (!stopped) timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };
    const poll = async () => {
      if (stopped) return;
      if (document.visibilityState === "hidden") {
        schedule();
        return;
      }
      controller = new AbortController();
      try {
        const response = await fetch(`/api/source-items/${sourceId}/processing`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          schedule();
          return;
        }
        const snapshot = await response.json() as ProcessingSnapshot;
        const changed = fingerprint.current !== null && fingerprint.current !== snapshot.fingerprint;
        fingerprint.current = snapshot.fingerprint;
        if (changed || !snapshot.busy) router.refresh();
        if (snapshot.busy) schedule();
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) schedule();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" || stopped) return;
      if (timer !== undefined) window.clearTimeout(timer);
      void poll();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void poll();
    return () => {
      stopped = true;
      controller?.abort();
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, router, sourceId]);

  return null;
}
