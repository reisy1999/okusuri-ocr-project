import { Badge } from "@/components/ui/badge"
import type { Segment } from "@/lib/api"

interface SegmentStepProps {
  segments: Segment[][]
  lineTexts: string[]
}

const labelConfig: Record<
  Segment["label"],
  { text: string; className: string }
> = {
  drug: { text: "drug", className: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  usage: { text: "usage", className: "bg-blue-100 text-blue-700 border-blue-300" },
  dosage: { text: "dosage", className: "bg-purple-100 text-purple-700 border-purple-300" },
  other: { text: "other", className: "bg-gray-100 text-gray-500 border-gray-300" },
}

export function SegmentStep({ segments, lineTexts }: SegmentStepProps) {
  return (
    <div className="max-h-[500px] overflow-auto space-y-2">
      {segments.map((segs, lineIdx) => (
        <div key={lineIdx} className="rounded border p-2">
          <div className="text-xs text-muted-foreground mb-1">
            行 {lineIdx + 1}: <span className="font-mono">{lineTexts[lineIdx]}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {segs.map((seg, segIdx) => {
              const config = labelConfig[seg.label]
              return (
                <span key={segIdx} className="inline-flex items-center gap-1">
                  <span
                    className={`text-sm px-1.5 py-0.5 rounded ${
                      seg.label === "drug" ? "font-semibold" : ""
                    }`}
                  >
                    {seg.value}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 leading-4 ${config.className}`}
                  >
                    {config.text}
                  </Badge>
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
