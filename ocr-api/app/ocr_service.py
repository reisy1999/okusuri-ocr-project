import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

import numpy as np
from PIL import Image
from paddleocr import PaddleOCR

from app.schemas import OCRResponse, WordResult

# OCR処理用のスレッドプール
_executor = ThreadPoolExecutor(max_workers=1)

# モデルキャッシュパスを環境変数で設定可能にする
CACHE_DIR = os.environ.get("PADDLEOCR_CACHE_DIR", "/app/models")


class OCRService:
    """PaddleOCR PP-OCRv5 OCRサービス"""

    def __init__(self):
        self._ocr: PaddleOCR | None = None

    @property
    def ocr(self) -> PaddleOCR:
        """遅延初期化でPaddleOCRを取得"""
        if self._ocr is None:
            # GPU利用可能か判定
            import paddle

            device = "gpu:0" if paddle.device.is_compiled_with_cuda() else "cpu"

            self._ocr = PaddleOCR(
                lang="japan",
                ocr_version="PP-OCRv5",
                device=device,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
            )
        return self._ocr

    def _run_ocr(self, image: np.ndarray):
        """同期的にOCR実行（スレッドプール用）"""
        return self.ocr.predict(image)

    async def process_image(self, image_bytes: bytes) -> OCRResponse:
        """画像バイトデータからOCR処理を実行"""
        pil_image = Image.open(BytesIO(image_bytes))

        # RGB形式に変換してNumpy配列に
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image = np.array(pil_image)

        # 別スレッドでOCR実行
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(_executor, self._run_ocr, image)

        # 結果をレスポンス形式に変換
        words = []
        for res in results:
            json_data = res.json
            if "rec_texts" in json_data:
                rec_texts = json_data["rec_texts"]
                rec_scores = json_data["rec_scores"]
                dt_polys = json_data["dt_polys"]
                dt_scores = json_data["dt_scores"]

                for i in range(len(rec_texts)):
                    poly = dt_polys[i]
                    # PaddleOCR の polygon → 4点座標 (int)
                    points = [[int(p[0]), int(p[1])] for p in poly]
                    words.append(
                        WordResult(
                            points=points,
                            content=rec_texts[i],
                            rec_score=float(rec_scores[i]),
                            det_score=float(dt_scores[i]),
                        )
                    )

        return OCRResponse(words=words, page_count=1)


# シングルトンインスタンス
ocr_service = OCRService()
