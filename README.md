# okusuri-ocr-project

お薬手帳の画像から薬品名を OCR で読み取り、厚労省の薬価基準データベースとファジーマッチングで照合するシステム。

OCR エンジンには日本語文書画像解析に特化した [YomiToku](https://github.com/kotaro-kinoshita/yomitoku) を使用しています。

## アーキテクチャ

```
画像 → [ocr-api] → OCR結果(テキスト) → [ocr-backend] → ファジーマッチング → 薬品名候補
                     YomiToku                               ↑
                                                    [okusuriDB] で構築した
                                                     薬価基準 SQLite DB
```

## 構成

```
okusuri-ocr-project/
├── docker-compose.yml     # 全サービスのオーケストレーション
├── ocr-api/               # OCR API（Python / FastAPI / YomiToku）
├── ocr-backend/           # バックエンド API（Node.js / Hono）
└── okusuriDB/             # 薬価DB構築ツール（Node.js / xlsx → SQLite）
```

| サービス | 技術スタック | ポート | 役割 |
|---|---|---|---|
| ocr-api | Python, FastAPI, YomiToku | 8000 | 画像から日本語テキストを抽出 |
| ocr-backend | Node.js, Hono, better-sqlite3 | 3000 | OCR結果を薬価DBとファジーマッチング |
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

初回起動時に YomiToku のモデル（約 1GB）が Hugging Face から自動ダウンロードされ、`ocr-api/models/` にキャッシュされます。

### 個別起動

```bash
# OCR API
cd ocr-api && pip install -r requirements.txt && uvicorn app.main:app --port 8000

# Backend
cd ocr-backend && npm install && npm run dev

# DB構築（初回のみ）
cd okusuriDB && npm install && npm run import
```

## API

### OCR API (`ocr-api`)

```bash
# ヘルスチェック
curl http://localhost:8000/health

# OCR実行
curl -X POST http://localhost:8000/ocr -F "file=@photo.jpg"
```

### Backend API (`ocr-backend`)

```bash
# ファジーマッチング
curl -X POST http://localhost:3000/fuzzy-match \
  -H "Content-Type: application/json" \
  -d '{"drugs": ["ロキソニン錠60mg"]}'
```

## データソース

薬価基準収載品目リスト（厚生労働省）:

| ファイル | 内容 | 件数 |
|---|---|---|
| tp20260220-01_01.xlsx | 内用薬 | 7,021 |
| tp20251205-01_03.xlsx | 外用薬 | 2,003 |

## ライセンス

本プロジェクトが依存する [YomiToku](https://github.com/kotaro-kinoshita/yomitoku) は **CC BY-NC-SA 4.0** ライセンスです。商用利用には YomiToku の別途ライセンスが必要です。
