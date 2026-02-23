"""PaddleOCR PP-OCRv5 / PaddleOCR-VL-1.5 性能検証 GUI"""

import json as json_mod
import os
import tempfile
import time

import gradio as gr
import numpy as np
import paddle
from paddleocr import PaddleOCR, PaddleOCRVL
from PIL import Image, ImageDraw, ImageFont

# GPU 自動検出
use_gpu = paddle.device.is_compiled_with_cuda()
device = "gpu" if use_gpu else "cpu"
print(f"GPU available: {use_gpu}")

# --- モデル初期化 (遅延ロード) ---
_ocr_v5 = None
_ocr_vl = None


def get_ocr_v5():
    global _ocr_v5
    if _ocr_v5 is None:
        print("Initializing PP-OCRv5...")
        _ocr_v5 = PaddleOCR(lang="japan", ocr_version="PP-OCRv5", device=device)
    return _ocr_v5


def get_ocr_vl():
    global _ocr_vl
    if _ocr_vl is None:
        print("Initializing PaddleOCR-VL-1.5...")
        _ocr_vl = PaddleOCRVL(device=device)
    return _ocr_vl


# --- 描画ユーティリティ ---
def draw_bboxes(image: Image.Image, result: list) -> Image.Image:
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except (OSError, IOError):
        font = ImageFont.load_default()
    for item in result:
        bbox = item["bbox"]
        points = [(int(p[0]), int(p[1])) for p in bbox]
        for i in range(4):
            draw.line([points[i], points[(i + 1) % 4]], fill="red", width=2)
        label = f"{item['rec_score']:.2f}"
        draw.text((points[0][0], points[0][1] - 16), label, fill="red", font=font)
    return image


# --- PP-OCRv5 ---
def run_ocr_v5(input_path: str | None):
    if input_path is None:
        return None, [], ""
    input_image = np.array(Image.open(input_path))
    engine = get_ocr_v5()
    start = time.time()
    results = list(engine.predict(input_path))
    elapsed = time.time() - start
    if not results:
        return Image.fromarray(input_image), [["(検出なし)", "", ""]], f"処理時間: {elapsed:.2f}s"
    res = results[0]
    dt_polys = res.get("dt_polys", []) if hasattr(res, "get") else []
    rec_texts = res.get("rec_text", res.get("rec_texts", [])) if hasattr(res, "get") else []
    rec_scores = res.get("rec_score", res.get("rec_scores", [])) if hasattr(res, "get") else []
    dt_scores = res.get("dt_scores", []) if hasattr(res, "get") else []
    if not rec_texts:
        return Image.fromarray(input_image), [["(検出なし)", "", ""]], f"処理時間: {elapsed:.2f}s"
    rows = []
    parsed = []
    for i, (poly, text, r_score) in enumerate(zip(dt_polys, rec_texts, rec_scores)):
        d_score = dt_scores[i] if i < len(dt_scores) else None
        parsed.append({"bbox": poly, "text": text, "rec_score": r_score})
        det_str = f"{d_score:.4f}" if d_score is not None else "-"
        rows.append([text, f"{r_score:.4f}", det_str])
    annotated = draw_bboxes(Image.fromarray(input_image), parsed)
    return annotated, rows, f"処理時間: {elapsed:.2f}s | {len(rows)} テキスト検出"


# --- PaddleOCR-VL-1.5 ---
def run_ocr_vl(input_path: str | None):
    if input_path is None:
        return None, "(画像を選択してください)", ""

    print(f"[VL] inference: {input_path}")
    engine = get_ocr_vl()

    start = time.time()
    results = list(engine.predict(
        input_path,
        use_layout_detection=False,
        prompt_label="ocr",
    ))
    elapsed = time.time() - start
    print(f"[VL] Done in {elapsed:.2f}s, {len(results)} result(s)")

    if not results:
        return None, "(検出なし)", f"処理時間: {elapsed:.2f}s"

    res = results[0]

    # --- 可視化画像 ---
    vis_img = None
    try:
        save_dir = tempfile.mkdtemp(prefix="vl_vis_")
        res.save_to_img(save_dir)
        saved_files = [f for f in os.listdir(save_dir) if f.endswith((".png", ".jpg"))]
        if saved_files:
            vis_img = Image.open(os.path.join(save_dir, saved_files[0]))
    except Exception as e:
        print(f"[VL] save_to_img failed: {e}")
    if vis_img is None and hasattr(res, "img") and res.img:
        img_data = res.img
        if hasattr(img_data, "keys"):
            for key in img_data:
                if isinstance(img_data[key], Image.Image):
                    vis_img = img_data[key]
                    break

    # --- プレーンテキスト出力 ---
    output_text = ""

    # parsing_res_list の block_content を結合
    try:
        j = res.json
        if isinstance(j, dict) and "parsing_res_list" in j:
            texts = [b["block_content"] for b in j["parsing_res_list"] if b.get("block_content")]
            output_text = "\n".join(texts)
            print(f"[VL] blocks: {len(texts)}")
    except Exception as e:
        print(f"[VL] json parse failed: {e}")

    # fallback: .markdown
    if not output_text:
        try:
            md = res.markdown
            if isinstance(md, dict):
                t = md.get("markdown_texts", "")
                output_text = "\n".join(t) if isinstance(t, list) else str(t)
            elif isinstance(md, str):
                output_text = md
        except Exception:
            pass

    # 最終 fallback
    if not output_text:
        output_text = str(res)

    status = f"処理時間: {elapsed:.2f}s"
    print(f"[VL] output length: {len(output_text)}")
    print(f"[VL] output:\n{output_text[:500]}")

    return vis_img, output_text, status


# --- GUI ---
with gr.Blocks(title="PaddleOCR 検証") as demo:
    gr.Markdown("# PaddleOCR 日本語 OCR 検証 GUI")
    gr.Markdown(f"GPU: **{'有効' if use_gpu else '無効 (CPU)'}**")

    with gr.Tab("PaddleOCR-VL-1.5"):
        gr.Markdown("Vision-Language モデル — プレーンテキスト出力")
        with gr.Row():
            vl_input = gr.Image(label="入力画像", type="filepath")
        vl_btn = gr.Button("OCR 実行 (VL-1.5)", variant="primary")
        vl_status = gr.Textbox(label="ステータス", lines=1)
        with gr.Row():
            vl_output_img = gr.Image(label="可視化結果", type="pil")
            vl_output_text = gr.Textbox(label="認識結果（プレーンテキスト）", lines=25, show_copy_button=True)
        vl_btn.click(
            fn=run_ocr_vl,
            inputs=[vl_input],
            outputs=[vl_output_img, vl_output_text, vl_status],
        )

    with gr.Tab("PP-OCRv5"):
        gr.Markdown("従来型 OCR パイプライン（Det + Rec）")
        with gr.Row():
            v5_input = gr.Image(label="入力画像", type="filepath")
        v5_btn = gr.Button("OCR 実行 (PP-OCRv5)", variant="primary")
        with gr.Row():
            v5_output_img = gr.Image(label="BBox 描画結果", type="pil")
            v5_output_table = gr.Dataframe(
                headers=["テキスト", "rec_score", "det_score"],
                label="認識結果",
                interactive=False,
            )
        v5_status = gr.Textbox(label="ステータス", lines=1)
        v5_btn.click(fn=run_ocr_v5, inputs=[v5_input], outputs=[v5_output_img, v5_output_table, v5_status])

demo.launch(server_name="0.0.0.0", server_port=7860)
