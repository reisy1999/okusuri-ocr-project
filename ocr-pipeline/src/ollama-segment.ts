export interface Segment {
  value: string;
  label: "drug" | "usage" | "dosage" | "other";
}

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "qwen3:4b-instruct-2507-q4_K_M";
const OLLAMA_CONCURRENCY = Number(process.env.OLLAMA_CONCURRENCY) || 1;

const SYSTEM_PROMPT = `You segment prescription OCR text into labeled chunks.
Rules:
1. Concatenating all values must exactly reproduce the original text
2. Labels: drug, dosage, usage, other
3. Output valid JSON only. No explanation, no markdown.
Example:
Input: サイザル錠5mg
Output: [{"value":"サイザル錠","label":"drug"},{"value":"5mg","label":"dosage"}]`;

interface OllamaResponse {
  message: {
    content: string;
  };
}

const validLabels = new Set(["drug", "usage", "dosage", "other"]);

/**
 * 1行のOCRテキストをセグメントに分割してラベリングする
 */
export async function segmentLine(text: string): Promise<Segment[]> {
  if (!text) return [{ value: text, label: "other" }];

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      format: "json",
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as OllamaResponse;
  const content = data.message.content;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.warn(`[segment] JSON parse failed for "${text}", fallback`);
    return [{ value: text, label: "other" }];
  }

  // Handle both [] and { result: [] } formats
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { result?: unknown }).result)
      ? ((parsed as { result: unknown[] }).result)
      : [];

  if (arr.length === 0) {
    return [{ value: text, label: "other" }];
  }

  const segments: Segment[] = arr.map((seg: any) => ({
    value: String(seg.value ?? ""),
    label: validLabels.has(seg.label) ? (seg.label as Segment["label"]) : "other",
  }));

  // Validate: concatenation must reproduce original text
  const concat = segments.map((s) => s.value).join("");
  if (concat !== text) {
    console.warn(
      `[segment] mismatch: "${concat}" !== "${text}", fallback`
    );
    return [{ value: text, label: "other" }];
  }

  return segments;
}

/**
 * 複数行を並列でセグメンテーションする（同時実行数制限付き）
 */
export async function segmentAllLines(lines: string[]): Promise<Segment[][]> {
  if (lines.length === 0) return [];

  const results: Segment[][] = new Array(lines.length);
  let next = 0;

  async function worker() {
    while (next < lines.length) {
      const i = next++;
      results[i] = await segmentLine(lines[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(OLLAMA_CONCURRENCY, lines.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}
