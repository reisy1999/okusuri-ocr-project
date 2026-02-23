FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# PaddlePaddle 3.x GPU (CUDA 11.8) — VL-1.5 requires >= 3.2.1
RUN pip3 install --no-cache-dir paddlepaddle-gpu \
    -i https://www.paddlepaddle.org.cn/packages/stable/cu118/

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

RUN mkdir -p /app/gradio_cache
ENV GRADIO_TEMP_DIR=/app/gradio_cache

COPY app.py .

EXPOSE 7860

CMD ["python3", "app.py"]
