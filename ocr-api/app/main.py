import torch
from fastapi import FastAPI, File, HTTPException, UploadFile

from app.ocr_service import ocr_service
from app.schemas import HealthResponse, OCRResponse

app = FastAPI(
    title="YomiToku OCR API",
    description="日本語ドキュメント画像解析API",
    version="0.1.0",
)


@app.get("/health", response_model=HealthResponse)
def health_check():
    """ヘルスチェック"""
    return HealthResponse(
        status="ok",
        gpu_available=torch.cuda.is_available(),
    )


@app.post("/ocr", response_model=OCRResponse)
async def ocr(file: UploadFile = File(...)):
    """
    画像ファイルからOCRを実行

    - **file**: 画像ファイル (JPEG, PNG等)
    """
    # ファイル形式チェック
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="画像ファイルを送信してください")

    # 画像データ読み込み
    image_bytes = await file.read()

    # OCR実行
    result = await ocr_service.process_image(image_bytes)

    return result
