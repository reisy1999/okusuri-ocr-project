import { useState, useRef, useCallback, type DragEvent } from "react"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  onSubmit: (file: File) => void
  loading: boolean
}

export function FileUpload({ onSubmit, loading }: FileUploadProps) {
  const [fileName, setFileName] = useState("")
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const selectedFile = useRef<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      selectedFile.current = file
      setFileName(file.name)
    }
  }

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      selectedFile.current = file
      setFileName(file.name)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  return (
    <div className="flex items-end gap-3">
      <div
        className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
          dragging
            ? "border-primary bg-accent"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {fileName ? (
          <span className="text-sm">{fileName}</span>
        ) : (
          <span className="text-sm text-muted-foreground">
            ドラッグ＆ドロップ または クリックで選択
          </span>
        )}
      </div>
      <Button
        onClick={() => selectedFile.current && onSubmit(selectedFile.current)}
        disabled={loading || !fileName}
      >
        {loading ? "処理中..." : "実行"}
      </Button>
    </div>
  )
}
