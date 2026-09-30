FROM python:3.11-slim

# Install system dependencies needed for OpenCV, PyMuPDF, and PaddlePaddle
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libspatialindex-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure Python doesn't buffer outputs
ENV PYTHONUNBUFFERED=1
ENV OMP_NUM_THREADS=1

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose port (Render/Railway use $PORT environment variable)
ENV PORT=8000
ENV HOST=0.0.0.0
ENV ALLOWED_ORIGINS=*

EXPOSE 8000

# Start FastAPI server using Uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
