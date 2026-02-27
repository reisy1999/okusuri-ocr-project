import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { PipelineResponse } from "@/lib/api"

interface AiSharePanelProps {
  data: PipelineResponse
}

function buildShareText(data: PipelineResponse): string {
  const lines: string[] = []

  // --- OCR ---
  lines.push("=== OCR ===")
  for (let i = 0; i < data.ocr.lines.length; i++) {
    const l = data.ocr.lines[i]
    const dir = l.is_vertical ? "vertical" : "horizontal"
    lines.push(`L${i}: "${l.text}" (conf:${(l.confidence * 100).toFixed(0)}%, ${dir})`)
  }

  // --- Segmentation ---
  lines.push("")
  lines.push("=== Segmentation ===")
  for (let i = 0; i < data.segments.length; i++) {
    const segs = data.segments[i]
    const parts = segs.map((s) => `[${s.label}:"${s.value}"]`).join(" ")
    lines.push(`L${i}: ${parts}`)
  }

  // --- Normalize + Match ---
  lines.push("")
  lines.push("=== Normalize -> Match ===")
  for (const m of data.matches) {
    const parts = [
      `input:"${m.input}"`,
      `normalized:"${m.normalized}"`,
      `match:"${m.best_match}"`,
      `score:${(m.score * 100).toFixed(0)}%`,
      m.status,
    ]
    if (m.prefix) parts.push(`prefix_removed:"${m.prefix}"`)
    if (m.suffix) parts.push(`suffix_removed:"${m.suffix}"`)
    lines.push(`L${m.source_line}: ${parts.join(" | ")}`)
  }

  return lines.join("\n")
}

export function AiSharePanel({ data }: AiSharePanelProps) {
  const [copied, setCopied] = useState(false)

  const text = buildShareText(data)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">AI共有用テキスト</CardTitle>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs font-mono">
          {text}
        </pre>
      </CardContent>
    </Card>
  )
}
