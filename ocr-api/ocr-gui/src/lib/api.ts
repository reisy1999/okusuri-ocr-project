export interface OCRLine {
  text: string
  confidence: number
  box: number[][]
  is_vertical: boolean
}

export interface OCRResponse {
  lines: OCRLine[]
}

export interface HealthResponse {
  status: string
  model: string
  device: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/ocr/health")
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return res.json()
}

export async function ocrFile(file: File): Promise<OCRResponse> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch("/ocr/file", { method: "POST", body: form })
  if (!res.ok) throw new Error(`OCR file failed: ${res.status}`)
  return res.json()
}

export async function ocrUrl(url: string): Promise<OCRResponse> {
  const res = await fetch("/ocr/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(`OCR URL failed: ${res.status}`)
  return res.json()
}

export async function ocrBase64(image: string): Promise<OCRResponse> {
  const res = await fetch("/ocr/base64", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  })
  if (!res.ok) throw new Error(`OCR base64 failed: ${res.status}`)
  return res.json()
}
