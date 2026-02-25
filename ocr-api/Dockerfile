# ============================================================
# Japanese OCR API — ndlocr-lite edition (single-stage)
#
# Build (GPU不要):
#   docker build -t japanese-ocr-api .
#
# Run (GPUサーバーで):
#   docker run --gpus all -p 8000:8000 japanese-ocr-api
#
# Run (CPUのみ):
#   docker run -p 8000:8000 japanese-ocr-api
# ============================================================
FROM python:3.10-slim

WORKDIR /app

# ---- ndlocr-lite dependencies + API dependencies ----
RUN pip install --no-cache-dir \
    onnxruntime-gpu==1.23.2 \
    lxml==5.2.2 \
    networkx==3.3 \
    pillow==12.1.1 \
    PyYAML==6.0.1 \
    numpy==2.2.2 \
    tqdm==4.66.4 \
    ordered-set==4.1.0 \
    fastapi \
    "uvicorn[standard]" \
    python-multipart \
    httpx

# ---- Application code ----
COPY ndlocr-lite/src/ /app/ndlocr-lite/src/
COPY app/ /app/app/
COPY run.py /app/run.py

EXPOSE 8000

CMD ["python", "run.py"]
