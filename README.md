# okusuri-ocr-project

お薬手帳の画像から薬品名を OCR で読み取り、厚労省の薬価基準データベースとファジーマッチングで照合するシステム。

OCR エンジンには [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) の PP-OCRv5 を使用しています。PP-OCRv5 は日本語を含む106言語以上をサポートし、高精度な文字認識を提供します。

## アーキテクチャ

```
Client → [ocr-pipeline:3000/pipeline/file]
              ↓ (内部 fetch)
          [ocr-api:8000/ocr/file] → OCR結果
              ↓
          正規化 + fuzzy match
              ↓
          統合レスポンス返却
```

## 構成

```
okusuri-ocr-project/
├── docker-compose.yml     # 全サービスのオーケストレーション
├── ocr-api/               # OCR API（Python / FastAPI / PaddleOCR）
├── ocr-pipeline/          # パイプライン API（Node.js / Hono）— OCR → 正規化 → ファジーマッチ
└── okusuriDB/             # 薬価DB構築ツール（Node.js / xlsx → SQLite）
```

| サービス | 技術スタック | ポート | 役割 |
|---|---|---|---|
| ocr-api | Python, FastAPI, PaddleOCR (PP-OCRv5) | 8000 | 画像から日本語テキストを抽出 |
| ocr-pipeline | Node.js, Hono, better-sqlite3 | 3000 | OCR → 正規化 → 薬価DBファジーマッチングのパイプライン |
| ocr-gui | React, TypeScript | 8080 | Web UI |
| okusuriDB | Node.js, xlsx, better-sqlite3 | - (CLI) | 厚労省 xlsx → SQLite DB 構築 |

## 必要環境

- Docker / Docker Compose
- NVIDIA GPU + CUDA 11.8 以上（OCR API に必要）
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

## セットアップ

### Docker（推奨）

```bash
docker compose up --build
```

初回起動時に PaddleOCR のモデルが自動ダウンロードされ、`ocr-api/models/` にキャッシュされます。

### 個別起動

```bash
# OCR API
cd ocr-api && pip install -r requirements.txt && uvicorn app.main:app --port 8000

# Pipeline
cd ocr-pipeline && npm install && npm run dev

# DB構築（初回のみ）
cd okusuriDB && npm install && npm run import
```

## API

### パイプライン API (`ocr-pipeline`)

画像を受け取り、OCR → 正規化 → ファジーマッチングまで1リクエストで完結。

```bash
# ヘルスチェック
curl http://localhost:3000/health

# 画像ファイルからパイプライン実行
curl -X POST http://localhost:3000/pipeline/file -F "file=@photo.jpg"

# URL指定
curl -X POST http://localhost:3000/pipeline/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/photo.jpg"}'

# Base64指定
curl -X POST http://localhost:3000/pipeline/base64 \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64>"}'
```

レスポンス例:

```json
{
  "ocr": {
    "lines": [
      { "text": "ロキソニン錠60mg", "confidence": 0.95, "box": [[...]], "is_vertical": false }
    ]
  },
  "matches": [
    {
      "input": "ロキソニン錠60mg",
      "best_match": "ロキソニン",
      "score": 0.92,
      "status": "modified",
      "confidence": 0.95
    }
  ]
}
```

### ファジーマッチ単体（後方互換）

```bash
curl -X POST http://localhost:3000/fuzzy-match \
  -H "Content-Type: application/json" \
  -d '{"drugs": ["ロキソニン錠60mg"]}'
```

### OCR API (`ocr-api`)

```bash
# ヘルスチェック
curl http://localhost:8000/health

# OCR実行
curl -X POST http://localhost:8000/ocr/file -F "file=@photo.jpg"
```

## データソース

薬価基準収載品目リスト（厚生労働省）:

| ファイル | 内容 | 件数 |
|---|---|---|
| tp20260220-01_01.xlsx | 内用薬 | 7,021 |
| tp20251205-01_03.xlsx | 外用薬 | 2,003 |

## ライセンス

本プロジェクトが依存する [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) は **Apache License 2.0** ライセンスです。
