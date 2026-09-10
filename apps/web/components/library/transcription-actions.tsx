"use client";

import { Button } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TranscriptionActions({
  sourceId,
  canTranscribe,
  configured,
  hasTranscript,
  fullText,
  busy: alreadyBusy,
}: {
  sourceId: string;
  canTranscribe: boolean;
  configured: boolean;
  hasTranscript: boolean;
  fullText?: string;
  busy: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function transcribe() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/source-items/${sourceId}/transcribe`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "无法创建转写任务");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法创建转写任务");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setMessage("全文已复制");
    } catch {
      setMessage("复制失败，请手动选择文本。");
    }
  }

  return (
    <div className="transcription-actions mt-4 flex flex-wrap items-center gap-2">
      {canTranscribe ? (
        <Button disabled={!configured || busy || alreadyBusy} onClick={transcribe}>
          {alreadyBusy ? "转写中…" : hasTranscript ? "重新转写" : "开始转写"}
        </Button>
      ) : null}
      {canTranscribe && !configured && !alreadyBusy ? <span className="text-sm text-[var(--text-secondary)]">语音转写服务暂时不可用，请联系管理员。</span> : null}
      {fullText ? <Button variant="secondary" disabled={busy} onClick={copy}>复制全文</Button> : null}
      {message ? <span role="status" className="text-sm text-[var(--text-secondary)]">{message}</span> : null}
    </div>
  );
}
