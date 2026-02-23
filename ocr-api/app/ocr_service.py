import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

import numpy as np
from PIL import Image
from yomitoku import DocumentAnalyzer

from app.schemas import OCRResponse, WordResult

# OCR処理用のスレッドプール
_executor = ThreadPoolExecutor(max_workers=1)

# モデルキャッシュパスを環境変数で設定可能にする
# 本番環境（閉域）ではボリュームマウントしたパスを指定
CACHE_DIR = os.environ.get("YOMITOKU_CACHE_DIR")
if CACHE_DIR:
    os.environ["HF_HOME"] = CACHE_DIR
    os.environ["HUGGINGFACE_HUB_CACHE"] = CACHE_DIR


class OCRService:
    """YomiToku OCRサービス"""

    def __init__(self):
        self._analyzer: DocumentAnalyzer | None = None

    @property
    def analyzer(self) -> DocumentAnalyzer:
        """遅延初期化でDocumentAnalyzerを取得"""
        if self._analyzer is None:
            # GPU利用可能ならcuda、なければcpu
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"
            self._analyzer = DocumentAnalyzer(device=device)
        return self._analyzer

    def _run_ocr(self, image: np.ndarray):
        """同期的にOCR実行（スレッドプール用）"""
        return self.analyzer(image)

    async def process_image(self, image_bytes: bytes) -> OCRResponse:
        """画像バイトデータからOCR処理を実行"""
        pil_image = Image.open(BytesIO(image_bytes))

        # RGB形式に変換してNumpy配列に
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image = np.array(pil_image)

        # 別スレッドでOCR実行（asyncio.run()の競合を回避）
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_executor, self._run_ocr, image)

        # 結果をレスポンス形式に変換
        words = []
        if result and len(result) > 0 and hasattr(result[0], "words"):
            for word in result[0].words:
                words.append(
                    WordResult(
                        points=word.points,
                        content=word.content,
                        direction=word.direction,
                        rec_score=word.rec_score,
                        det_score=word.det_score,
                    )
                )

        return OCRResponse(words=words, page_count=1)


# シングルトンインスタンス
ocr_service = OCRService()
