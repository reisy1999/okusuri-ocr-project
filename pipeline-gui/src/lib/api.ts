export interface OCRLine {
  text: string
  confidence: number
  box: number[][]
  is_vertical: boolean
}

export interface Segment {
  value: string
  label: "drug" | "usage" | "dosage" | "other"
}

export interface PipelineMatch {
  input: string
  normalized: string
  prefix: string
  suffix: string
  best_match: string
  score: number
  status: "unmodified" | "modified" | "no_match"
  confidence: number
  source_line: number
}

export interface PipelineResponse {
  ocr: { lines: OCRLine[] }
  segments: Segment[][]
  matches: PipelineMatch[]
}

export interface HealthResponse {
  status: string
  uptime: number
}

export async function pipelineFile(file: File): Promise<PipelineResponse> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch("/pipeline/file", { method: "POST", body: form })
  if (!res.ok) throw new Error(`Pipeline failed: ${res.status}`)
  return res.json()
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/health")
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return res.json()
}
