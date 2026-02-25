from pydantic import BaseModel


class OCRLine(BaseModel):
    text: str
    confidence: float
    box: list[list[int]]  # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
    is_vertical: bool


class OCRResponse(BaseModel):
    lines: list[OCRLine]


class OCRRequestBase64(BaseModel):
    image: str  # base64 encoded


class OCRRequestURL(BaseModel):
    url: str


class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
