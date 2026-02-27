import type { PipelineMatch, OCRLine } from "@/lib/api"

interface NormalizeStepProps {
  matches: PipelineMatch[]
  ocrLines: OCRLine[]
}

export function NormalizeStep({ matches, ocrLines }: NormalizeStepProps) {
  // Group by source_line
  const grouped = new Map<number, PipelineMatch[]>()
  for (const m of matches) {
    if (!grouped.has(m.source_line)) grouped.set(m.source_line, [])
    grouped.get(m.source_line)!.push(m)
  }

  const lineIndices = [...grouped.keys()].sort((a, b) => a - b)

  return (
    <div className="max-h-[500px] overflow-auto space-y-2">
      {lineIndices.map((lineIdx) => {
        const lineMatches = grouped.get(lineIdx)!
        const ocrText = ocrLines[lineIdx]?.text ?? ""
        return (
          <div key={lineIdx} className="rounded border p-2">
            <div className="text-xs text-muted-foreground mb-1">
              行 {lineIdx + 1}: <span className="font-mono">{ocrText}</span>
            </div>
            <div className="space-y-1">
              {lineMatches.map((m, i) => (
                <div key={i} className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium">{m.input}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold text-emerald-600">{m.normalized}</span>
                  {(m.prefix || m.suffix) && (
                    <span className="text-xs text-orange-500">
                      (除去:{" "}
                      {[
                        m.prefix && `前「${m.prefix}」`,
                        m.suffix && `後「${m.suffix}」`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      )
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
