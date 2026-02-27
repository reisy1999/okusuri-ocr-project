import { Hono } from "hono";
import { ocrFile, ocrUrl, ocrBase64, OCRResponse } from "./ocr-client";
import { findBestMatch, MatchResult } from "./fuzzy-match";
import { normalizeMedicineName, NormalizeResult } from "./normalize";
import { segmentAllLines, Segment } from "./ollama-segment";

interface PipelineResponse {
  ocr: { lines: OCRResponse["lines"] };
  segments: Segment[][];
  matches: (MatchResult &
    NormalizeResult & { confidence: number; source_line: number })[];
}

function elapsed(t0: number): string {
  return `${((performance.now() - t0) / 1000).toFixed(1)}s`;
}

async function buildResponse(ocr: OCRResponse): Promise<PipelineResponse> {
  const t0 = performance.now();

  console.log(`[1/4] OCR 完了 — ${ocr.lines.length} 行検出`);

  console.log(`[2/4] セグメンテーション開始 (Ollama, 1行ずつ並列)...`);
  const lineTexts = ocr.lines.map((l) => l.text);
  const segments = await segmentAllLines(lineTexts);
  console.log(`[2/4] セグメンテーション完了 — ${elapsed(t0)}`);

  // Extract drug segments with their source line index
  const drugEntries: { value: string; lineIndex: number }[] = [];
  segments.forEach((segs, lineIndex) => {
    for (const seg of segs) {
      if (seg.label === "drug") {
        drugEntries.push({ value: seg.value, lineIndex });
      }
    }
  });

  console.log(`[3/4] 正規化 + マッチング — drug ${drugEntries.length} 件`);
  const matches = drugEntries.map((entry) => {
    const norm = normalizeMedicineName(entry.value);
    return {
      ...findBestMatch(entry.value),
      normalized: norm.normalized,
      prefix: norm.prefix,
      suffix: norm.suffix,
      confidence: ocr.lines[entry.lineIndex].confidence,
      source_line: entry.lineIndex,
    };
  });

  console.log(`[4/4] 完了 — 合計 ${elapsed(t0)}`);
  return { ocr: { lines: ocr.lines }, segments, matches };
}

const pipeline = new Hono();

pipeline.post("/file", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "file field is required" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ocr = await ocrFile(buffer, file.name, file.type || "image/jpeg");
  return c.json(await buildResponse(ocr));
});

pipeline.post("/url", async (c) => {
  const { url } = await c.req.json<{ url: string }>();

  if (!url || typeof url !== "string") {
    return c.json({ error: "url is required" }, 400);
  }

  const ocr = await ocrUrl(url);
  return c.json(await buildResponse(ocr));
});

pipeline.post("/base64", async (c) => {
  const { image } = await c.req.json<{ image: string }>();

  if (!image || typeof image !== "string") {
    return c.json({ error: "image (base64) is required" }, 400);
  }

  const ocr = await ocrBase64(image);
  return c.json(await buildResponse(ocr));
});

export { pipeline };
