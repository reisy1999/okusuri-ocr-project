export interface OCRLine {
  text: string;
  confidence: number;
  box: number[][];
  is_vertical: boolean;
}

export interface OCRResponse {
  lines: OCRLine[];
}

const OCR_API_URL = process.env.OCR_API_URL || "http://localhost:8000";

async function handleResponse(res: Response): Promise<OCRResponse> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ocr-api returned ${res.status}: ${body}`);
  }
  return res.json() as Promise<OCRResponse>;
}

export async function ocrFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<OCRResponse> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: contentType }),
    filename
  );

  const res = await fetch(`${OCR_API_URL}/ocr/file`, {
    method: "POST",
    body: form,
  });
  return handleResponse(res);
}

export async function ocrUrl(url: string): Promise<OCRResponse> {
  const res = await fetch(`${OCR_API_URL}/ocr/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return handleResponse(res);
}

export async function ocrBase64(image: string): Promise<OCRResponse> {
  const res = await fetch(`${OCR_API_URL}/ocr/base64`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  return handleResponse(res);
}
