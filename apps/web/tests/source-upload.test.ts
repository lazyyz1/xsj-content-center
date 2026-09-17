import { describe, expect, it } from "vitest";
import { sourceUploadStatusLabel } from "../lib/source-upload-client";
import { uploadErrorMessage, validateUploadedFile } from "../server/source-upload";

describe("source upload validation", () => {
  it("reads UTF-8 TXT into source content", async () => {
    const file = new File([new TextEncoder().encode("这是一段可交给 LLM 的正文。")], "notes.txt", { type: "text/plain" });
    await expect(validateUploadedFile(file)).resolves.toMatchObject({ kind: "TEXT", sourceType: "TEXT", assetType: "DOCUMENT", contentText: "这是一段可交给 LLM 的正文。", mimeType: "text/plain" });
  });

  it("rejects malformed office files and empty files", async () => {
    await expect(validateUploadedFile(new File(["x"], "notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))).rejects.toThrow("MIME_MISMATCH");
    await expect(validateUploadedFile(new File([], "notes.txt", { type: "text/plain" }))).rejects.toThrow("EMPTY_FILE");
    expect(uploadErrorMessage("PDF_TEXT_EMPTY")).toContain("扫描版 PDF");
  });

  it("checks a media magic header instead of trusting browser MIME", async () => {
    const fakeMp4 = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]);
    await expect(validateUploadedFile(new File([fakeMp4], "clip.mp4", { type: "video/mp4" }))).resolves.toMatchObject({ kind: "VIDEO", assetType: "VIDEO" });
    await expect(validateUploadedFile(new File([new TextEncoder().encode("not a video")], "clip.mp4", { type: "video/mp4" }))).rejects.toThrow("MIME_MISMATCH");
  });

  it("accepts decoded PNG images and validates DOCX signatures", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    await expect(validateUploadedFile(new File([png], "cover.png", { type: "image/png" }))).resolves.toMatchObject({ kind: "IMAGE", sourceType: "IMAGE", assetType: "IMAGE", mimeType: "image/png" });
    await expect(validateUploadedFile(new File([new Uint8Array([80, 75, 3, 4, 1])], "brief.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))).rejects.toThrow("DOCX_TEXT_EMPTY");
  });

  it("shows upload success before and after background reading", () => {
    expect(sourceUploadStatusLabel({ status: "QUEUED", processingStatus: "QUEUED" })).toBe("已上传，正在读取");
    expect(sourceUploadStatusLabel({ status: "QUEUED", processingStatus: "SUCCEEDED" })).toBe("已准备好");
    expect(sourceUploadStatusLabel({ status: "QUEUED", processingStatus: "FAILED" })).toBe("上传成功 · 读取失败");
  });
});
