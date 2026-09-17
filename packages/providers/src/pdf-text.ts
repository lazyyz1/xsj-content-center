import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

function resolvePdfWorker() {
  const packageJsonCandidates = [
    typeof __filename === "string" ? __filename : null,
    resolve(process.cwd(), "package.json"),
    resolve(process.cwd(), "packages/providers/package.json"),
    resolve(process.cwd(), "../../packages/providers/package.json"),
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const packageJson of packageJsonCandidates) {
    try {
      const packageRequire = createRequire(packageJson);
      const packageEntry = packageRequire.resolve("pdf-parse");
      return pathToFileURL(resolve(dirname(packageEntry), "../esm/pdf.worker.mjs")).toString();
    } catch {
      // Try the next workspace package root; development commands use different cwd values.
    }
  }
  throw new Error("Unable to resolve the pdf-parse worker.");
}

PDFParse.setWorker(resolvePdfWorker());

export class PdfTextExtractionError extends Error {
  readonly code = "PDF_TEXT_EXTRACTION_FAILED";

  constructor(message = "PDF 正文读取失败。") {
    super(message);
    this.name = "PdfTextExtractionError";
  }
}

function normalizePdfText(value: string) {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export async function extractPdfText(data: Uint8Array) {
  if (data.byteLength === 0) throw new PdfTextExtractionError("PDF 文件为空。");
  const parser = new PDFParse({ data: Buffer.from(data) });
  try {
    const result = await parser.getText();
    return normalizePdfText(result.text);
  } catch {
    throw new PdfTextExtractionError();
  } finally {
    await parser.destroy();
  }
}
