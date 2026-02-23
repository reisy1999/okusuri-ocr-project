# CUDA 12.4 + Python 3.11 ベースイメージ
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

WORKDIR /app

# システム依存パッケージ
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Pythonパッケージインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコード
COPY app/ ./app/

# モデルキャッシュパス（環境変数で上書き可能）
# 本番環境ではボリュームマウントしたパスを指定
ENV YOMITOKU_CACHE_DIR=/app/models

# ポート
EXPOSE 8000

# 起動コマンド
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
