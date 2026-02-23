# PaddleOCR-VL-1.5 出力構造調査依頼

## 背景

PaddleOCR-VL-1.5 を Gradio GUI で検証中。OCR 自体は動作するが、`predict()` の戻り値の正確な構造が不明で、座標情報やテキストを正しく取り出せていない。

## 環境

- paddleocr 3.4.0
- paddlex 3.4.2
- paddlepaddle-gpu (CUDA 11.8, PaddlePaddle 3.x)
- Python 3.10

## 現在のコード

```python
from paddleocr import PaddleOCRVL

engine = PaddleOCRVL(device="gpu")
results = list(engine.predict("image.jpg", format_block_content=True))
res = results[0]

# res.json, res.markdown, res.img の正確な構造が不明
```

## 調査してほしいこと

### 1. `res.json` の完全な構造

- トップレベルのキー名一覧
- `parsing_res_list` は存在するか？
- 各ブロックのキー名（`block_bbox`, `block_content`, `block_label`, `block_order` 等）
- `block_bbox` の形式は `[x1, y1, x2, y2]` か、polygon か？
- `block_label` の取りうる値（`text`, `table`, `title` 等）

### 2. `format_block_content=True` の効果

- テーブルが HTML → Markdown に変換されるのか？
- `block_content` の中身がどう変わるか（before / after の具体例）

### 3. `res.markdown` の構造

- 返り値の型（dict? str?）
- dict の場合のキー名（`markdown_texts` 等）
- テーブルはどの形式で格納されるか

### 4. `res.img` の構造

- キー名一覧（`overall_ocr_res`, `layout_det_res` 等）
- 各値の型（PIL.Image?）

### 5. `res.print()` の出力例

- 実際の画像を処理した際の `res.print()` のターミナル出力

## 参照すべき公式ドキュメント

- https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/PaddleOCR-VL.html
- https://paddlepaddle.github.io/PaddleX/3.3/en/pipeline_usage/tutorials/ocr_pipelines/PaddleOCR-VL.html
- https://github.com/PaddlePaddle/PaddleOCR ソースコード（`paddleocr/_pipelines/` 配下）
- https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.5

## 期待する成果物

上記 1〜5 の各項目について、公式ドキュメントまたはソースコードの該当箇所を引用した回答。可能であれば実際の出力例付き。
