from pydantic import BaseModel


class WordResult(BaseModel):
    """OCRで検出された1単語の結果"""

    points: list[list[int]]  # 4点の座標 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    content: str  # 認識されたテキスト
    direction: str  # テキストの方向 (horizontal/vertical)
    rec_score: float  # 認識スコア (0-1)
    det_score: float  # 検出スコア (0-1)


class OCRResponse(BaseModel):
    """OCRレスポンス"""

    words: list[WordResult]
    page_count: int = 1


class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""

    status: str
    gpu_available: bool
