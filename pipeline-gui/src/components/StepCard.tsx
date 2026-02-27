import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StepCardProps {
  step: number
  title: string
  accent: string
  children: ReactNode
  showArrow?: boolean
}

export function StepCard({ step, title, accent, children, showArrow = true }: StepCardProps) {
  return (
    <>
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center size-6 rounded-full text-xs font-bold text-white"
              style={{ background: accent }}
            >
              {step}
            </span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {showArrow && (
        <div className="flex justify-center py-1 text-muted-foreground text-xl">
          ↓
        </div>
      )}
    </>
  )
}
