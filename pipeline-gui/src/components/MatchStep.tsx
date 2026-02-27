import { Badge } from "@/components/ui/badge"
import type { PipelineMatch, OCRLine } from "@/lib/api"

interface MatchStepProps {
  matches: PipelineMatch[]
  ocrLines: OCRLine[]
}

function statusColor(status: PipelineMatch["status"]) {
  switch (status) {
    case "unmodified":
      return "bg-emerald-100 text-emerald-700"
    case "modified":
      return "bg-amber-100 text-amber-700"
    case "no_match":
      return "bg-red-100 text-red-700"
  }
}

function statusLabel(status: PipelineMatch["status"]) {
  switch (status) {
    case "unmodified":
      return "完全一致"
    case "modified":
      return "類似"
    case "no_match":
      return "不一致"
  }
}

export function MatchStep({ matches, ocrLines }: MatchStepProps) {
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
              {lineMatches.map((m, i) => {
                const pct = Math.round(m.score * 100)
                return (
                  <div
                    key={i}
                    className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-sm"
                  >
                    <span className="font-medium shrink-0">{m.input}</span>
                    <span className="text-muted-foreground shrink-0">→</span>
                    <span className="shrink-0">{m.best_match}</span>
                    <div className="flex items-center gap-1.5 w-28 shrink-0">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background:
                              pct >= 85
                                ? "#10b981"
                                : pct >= 60
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                    <Badge className={statusColor(m.status)} variant="outline">
                      {statusLabel(m.status)}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
