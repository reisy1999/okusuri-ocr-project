import { useState, useRef, useCallback, type DragEvent } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface InputTabsProps {
  onSubmitFile: (file: File) => void
  onSubmitUrl: (url: string) => void
  onSubmitBase64: (b64: string) => void
  loading: boolean
}

export function InputTabs({ onSubmitFile, onSubmitUrl, onSubmitBase64, loading }: InputTabsProps) {
  const [url, setUrl] = useState("")
  const [base64, setBase64] = useState("")
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
    <Tabs defaultValue="file">
      <TabsList>
        <TabsTrigger value="file">ファイル</TabsTrigger>
        <TabsTrigger value="url">URL</TabsTrigger>
        <TabsTrigger value="base64">Base64</TabsTrigger>
      </TabsList>

      <TabsContent value="file">
        <div className="flex items-end gap-3">
          <div
            className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
              dragging ? "border-primary bg-accent" : "border-muted-foreground/25 hover:border-primary/50"
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
            onClick={() => selectedFile.current && onSubmitFile(selectedFile.current)}
            disabled={loading || !fileName}
          >
            {loading ? "処理中..." : "実行"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="url">
        <div className="flex items-end gap-3">
          <Input
            className="flex-1"
            placeholder="https://example.com/image.jpg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button
            onClick={() => onSubmitUrl(url)}
            disabled={loading || !url}
          >
            {loading ? "処理中..." : "実行"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="base64">
        <div className="flex flex-col gap-3">
          <Textarea
            className="min-h-[120px] font-mono text-xs"
            placeholder="Base64エンコードされた画像データを貼り付け..."
            value={base64}
            onChange={(e) => setBase64(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => onSubmitBase64(base64)}
              disabled={loading || !base64}
            >
              {loading ? "処理中..." : "実行"}
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
