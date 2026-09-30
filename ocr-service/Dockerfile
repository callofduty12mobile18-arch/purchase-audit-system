# Multi-stage lightweight Python container for PaddleOCR FastApi Service
FROM python:3.11-slim

# Install system dependencies needed for OpenCV, PyMuPDF, and PaddlePaddle
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libspatialindex-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download PaddleOCR models during build so container starts instantly
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='en')"

# Copy application source code
COPY . .

# Expose port (Render/Railway use $PORT environment variable)
ENV PORT=8000
ENV HOST=0.0.0.0
ENV ALLOWED_ORIGINS=*

EXPOSE 8000

# Start server using Uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
