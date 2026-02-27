import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { PipelineResponse } from "@/lib/api"

interface JsonPanelProps {
  data: PipelineResponse
}

export function JsonPanel({ data }: JsonPanelProps) {
  const [copied, setCopied] = useState(false)

  const json = JSON.stringify(data, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">レスポンス JSON</CardTitle>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[400px] overflow-auto rounded bg-muted p-3 text-xs font-mono">
          {json}
        </pre>
      </CardContent>
    </Card>
  )
}
