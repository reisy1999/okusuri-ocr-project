import { useState, useCallback } from "react"
import { HealthCheck } from "@/components/HealthCheck"
import { InputTabs } from "@/components/InputTabs"
import { ResultView } from "@/components/ResultView"
import { JsonPanel } from "@/components/JsonPanel"
import { ocrFile, ocrUrl, ocrBase64, type OCRResponse } from "@/lib/api"

export default function App() {
  const [result, setResult] = useState<OCRResponse | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [elapsed, setElapsed] = useState<number | null>(null)

  const run = useCallback(async (fn: () => Promise<OCRResponse>) => {
    setLoading(true)
    setError("")
    setResult(null)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const data = await fn()
      setElapsed(Math.round(performance.now() - t0))
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    run(() => ocrFile(file))
  }, [run])

  const handleUrl = useCallback((url: string) => {
    setImageUrl(url)
    run(() => ocrUrl(url))
  }, [run])

  const handleBase64 = useCallback((b64: string) => {
    const clean = b64.replace(/^data:image\/\w+;base64,/, "")
    setImageUrl(`data:image/png;base64,${clean}`)
    run(() => ocrBase64(clean))
  }, [run])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">OCR Performance Checker</h1>
        <HealthCheck />
      </header>

      <section className="mb-6">
        <InputTabs
          onSubmitFile={handleFile}
          onSubmitUrl={handleUrl}
          onSubmitBase64={handleBase64}
          loading={loading}
        />
      </section>

      {error && (
        <div className="mb-4 rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {(elapsed !== null || result) && (
        <div className="mb-4 flex gap-6 text-sm text-muted-foreground">
          {elapsed !== null && <span>処理時間: <strong className="text-foreground">{elapsed} ms</strong></span>}
          {result && <span>検出行数: <strong className="text-foreground">{result.lines.length}</strong></span>}
        </div>
      )}

      {result && (
        <>
          <section className="mb-4">
            <ResultView lines={result.lines} imageUrl={imageUrl} />
          </section>
          <section>
            <JsonPanel data={result} />
          </section>
        </>
      )}
    </div>
  )
}
