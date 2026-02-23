# okusuri-ocr-project

お薬手帳の画像から薬品名を OCR で読み取り、薬価基準データベースとファジーマッチングを行うシステム。

## 構成

```
okusuri-ocr-project/
├── docker-compose.yml     # 全サービスのオーケストレーション
├── ocr-api/               # OCR API（Python / FastAPI / YomiToku）
├── ocr-backend/           # バックエンド API（Node.js / Hono）
└── okusuriDB/             # 薬価DB構築ツール（Node.js / xlsx → SQLite）
```

| サービス | 技術スタック | ポート |
|---|---|---|
| ocr-api | Python, FastAPI, YomiToku (GPU) | 8000 |
| ocr-backend | Node.js, Hono, better-sqlite3 | 3000 |
| okusuriDB | Node.js, xlsx, better-sqlite3 | - (CLIツール) |

## セットアップ

### Docker（推奨）

```bash
docker compose up --build
```

### 個別起動

```bash
# OCR API
cd ocr-api && pip install -r requirements.txt && uvicorn app.main:app --port 8000

# Backend
cd ocr-backend && npm install && npm run dev

# DB構築
cd okusuriDB && npm install && npm run import
```
