import { useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OCRLine } from "@/lib/api"

interface OcrStepProps {
  lines: OCRLine[]
  imageUrl: string | null
}

const VERTICAL_COLOR = "rgba(99, 102, 241, 0.6)"
const HORIZONTAL_COLOR = "rgba(16, 185, 129, 0.6)"

export function OcrStep({ lines, imageUrl }: OcrStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      for (const line of lines) {
        const color = line.is_vertical ? VERTICAL_COLOR : HORIZONTAL_COLOR
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(2, Math.round(img.naturalWidth / 500))

        const [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] = line.box
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.lineTo(x3, y3)
        ctx.lineTo(x4, y4)
        ctx.closePath()
        ctx.stroke()
      }
    }
    img.src = imageUrl
  }, [imageUrl, lines])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="flex gap-3 text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded" style={{ background: VERTICAL_COLOR }} />
            縦書き
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded" style={{ background: HORIZONTAL_COLOR }} />
            横書き
          </span>
        </div>
        {imageUrl && (
          <canvas
            ref={canvasRef}
            className="w-full rounded border"
            style={{ imageRendering: "auto" }}
          />
        )}
      </div>
      <div className="max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>テキスト</TableHead>
              <TableHead className="w-20 text-right">信頼度</TableHead>
              <TableHead className="w-16 text-center">方向</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{line.text}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {(line.confidence * 100).toFixed(1)}%
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={line.is_vertical ? "default" : "secondary"}>
                    {line.is_vertical ? "縦" : "横"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
