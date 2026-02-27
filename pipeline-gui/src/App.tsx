import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileUpload } from "@/components/FileUpload"
import { StepCard } from "@/components/StepCard"
import { OcrStep } from "@/components/OcrStep"
import { SegmentStep } from "@/components/SegmentStep"
import { NormalizeStep } from "@/components/NormalizeStep"
import { MatchStep } from "@/components/MatchStep"
import { JsonPanel } from "@/components/JsonPanel"
import { AiSharePanel } from "@/components/AiSharePanel"
import { pipelineFile, fetchHealth, type PipelineResponse, type HealthResponse } from "@/lib/api"

export default function App() {
  const [result, setResult] = useState<PipelineResponse | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [elapsed, setElapsed] = useState<number | null>(null)

  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState("")
  const [healthLoading, setHealthLoading] = useState(false)

  const checkHealth = async () => {
    setHealthLoading(true)
    setHealthError("")
    try {
      const data = await fetchHealth()
      setHealth(data)
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : "Unknown error")
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }

  const handleSubmit = useCallback(async (file: File) => {
    setLoading(true)
    setError("")
    setResult(null)
    setElapsed(null)

    const url = URL.createObjectURL(file)
    setImageUrl(url)

    const t0 = performance.now()
    try {
      const data = await pipelineFile(file)
      setElapsed(Math.round(performance.now() - t0))
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  const drugCount = result
    ? result.segments.reduce(
        (sum, segs) => sum + segs.filter((s) => s.label === "drug").length,
        0
      )
    : 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Pipeline Debug Viewer</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={checkHealth} disabled={healthLoading}>
            {healthLoading ? "Checking..." : "Health"}
          </Button>
          {health && (
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <Badge variant="secondary">{health.status}</Badge>
            </div>
          )}
          {healthError && <span className="text-sm text-destructive">{healthError}</span>}
        </div>
      </header>

      <section className="mb-6">
        <FileUpload onSubmit={handleSubmit} loading={loading} />
      </section>

      {error && (
        <div className="mb-4 rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {(elapsed !== null || result) && (
        <div className="mb-4 flex gap-6 text-sm text-muted-foreground">
          {elapsed !== null && (
            <span>
              処理時間: <strong className="text-foreground">{elapsed} ms</strong>
            </span>
          )}
          {result && (
            <>
              <span>
                検出行数: <strong className="text-foreground">{result.ocr.lines.length}</strong>
              </span>
              <span>
                薬品セグメント: <strong className="text-foreground">{drugCount}</strong>
              </span>
            </>
          )}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-1">
          <StepCard step={1} title="OCR 文字認識" accent="#6366f1">
            <OcrStep lines={result.ocr.lines} imageUrl={imageUrl} />
          </StepCard>

          <StepCard step={2} title="セグメンテーション (Ollama)" accent="#8b5cf6">
            <SegmentStep
              segments={result.segments}
              lineTexts={result.ocr.lines.map((l) => l.text)}
            />
          </StepCard>

          <StepCard step={3} title="正規化 (drug のみ)" accent="#f59e0b">
            <NormalizeStep matches={result.matches} ocrLines={result.ocr.lines} />
          </StepCard>

          <StepCard step={4} title="マッチング" accent="#10b981" showArrow={false}>
            <MatchStep matches={result.matches} ocrLines={result.ocr.lines} />
          </StepCard>

          <AiSharePanel data={result} />
          <JsonPanel data={result} />
        </div>
      )}
    </div>
  )
}
