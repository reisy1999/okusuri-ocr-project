import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchHealth, type HealthResponse } from "@/lib/api"

export function HealthCheck() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const check = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchHealth()
      setHealth(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={check} disabled={loading}>
        {loading ? "Checking..." : "Health Check"}
      </Button>
      {health && (
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-muted-foreground">{health.status}</span>
          <Badge variant="secondary">{health.device}</Badge>
        </div>
      )}
      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </div>
  )
}
