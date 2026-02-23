# okusuriDB

厚労省の薬価基準収載品目リスト（xlsx）から SQLite データベース `medicines.db` を生成するツール。

## セットアップ

```bash
npm install
```

## 使い方

```bash
npm run import
```

プロジェクトルートの xlsx ファイルを読み込み、`medicines.db` を生成／更新する。

## テーブル定義

**medicines**

| カラム | 型 | 内容 |
|---|---|---|
| id | INTEGER PRIMARY KEY | 自動採番 |
| generic_name | TEXT | 一般名（成分名） |
| brand_name | TEXT | 商品名（品名） |
| category | TEXT | 内用薬 / 外用薬 |

## データソース

| ファイル | 内容 | 件数 |
|---|---|---|
| tp20260220-01_01.xlsx | 内用薬 | 7,021 |
| tp20251205-01_03.xlsx | 外用薬 | 2,003 |
