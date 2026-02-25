import asyncio
import base64
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, UploadFile

from .ocr_engine import NdlOCREngine
from .schemas import HealthResponse, OCRLine, OCRRequestBase64, OCRRequestURL, OCRResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/tiff", "image/webp"}

engine = NdlOCREngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine.initialize()
    yield


app = FastAPI(title="Japanese OCR API", version="2.0.0", lifespan=lifespan)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def _lines_to_response(raw: list[dict]) -> OCRResponse:
    return OCRResponse(
        lines=[
            OCRLine(
                text=r["text"],
                confidence=r["confidence"],
                box=r["box"],
                is_vertical=r["is_vertical"],
            )
            for r in raw
        ]
    )


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        model="ndlocr-lite",
        device=engine.device,
    )


@app.post("/ocr/file", response_model=OCRResponse)
async def ocr_file(file: UploadFile):
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, f"Unsupported content type: {file.content_type}")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(413, "File exceeds 20 MB limit")
    lines = await asyncio.to_thread(engine.predict, data)
    return _lines_to_response(lines)


@app.post("/ocr/base64", response_model=OCRResponse)
async def ocr_base64(req: OCRRequestBase64):
    try:
        data = base64.b64decode(req.image)
    except Exception:
        raise HTTPException(400, "Invalid base64 data")
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(413, "Image exceeds 20 MB limit")
    lines = await asyncio.to_thread(engine.predict, data)
    return _lines_to_response(lines)


@app.post("/ocr/url", response_model=OCRResponse)
async def ocr_url(req: OCRRequestURL):
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(req.url)
            resp.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(400, f"Failed to fetch image: {e}")
    data = resp.content
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(413, "Image exceeds 20 MB limit")
    lines = await asyncio.to_thread(engine.predict, data)
    return _lines_to_response(lines)
