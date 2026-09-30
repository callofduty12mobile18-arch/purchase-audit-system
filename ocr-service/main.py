import io
import os
import sys
from pathlib import Path

# Ensure ocr-service directory is on Python search path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import shutil
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import settings
from schemas import ExtractedOcrInvoice, HealthResponse
from ocr_engine import OcrEngine, bytes_to_images
from preprocessing import preprocess_image
from parser import parse_ocr_results


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load PaddleOCR model once into memory
    print(f"Starting OCR Service on port {settings.PORT}...")
    engine = OcrEngine.get_instance()
    try:
        engine.initialize()
    except Exception as e:
        print(f"Warning: Model pre-initialization error: {e}")
    yield
    # Shutdown
    print("Shutting down OCR Service.")


app = FastAPI(
    title="Invoice OCR Processing Engine",
    description="Local OCR microservice powered by OpenCV & PaddleOCR for purchase invoices",
    version="1.0.0",
    lifespan=lifespan
)

# Robust Cross-Origin Resource Sharing (CORS) for Cloud & Mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


@app.get("/")
@app.head("/")
async def root():
    """Root endpoint for status verification."""
    return {"service": "invoice-ocr-service", "status": "running"}


@app.get("/health", response_model=HealthResponse)
@app.head("/health")
async def health_check():
    """Health check endpoint to report service and model status."""
    engine = OcrEngine.get_instance()
    return HealthResponse(
        status="healthy",
        model_loaded=engine.is_ready,
        ocr_lang=settings.OCR_LANG,
        supported_formats=["image/jpeg", "image/png", "image/webp", "application/pdf"],
        max_file_size_mb=settings.MAX_FILE_SIZE_MB
    )


@app.post("/ocr/invoice", response_model=ExtractedOcrInvoice)
async def extract_invoice(file: UploadFile = File(...)):
    """
    Extract structured invoice data from an uploaded invoice image or PDF.
    Files are processed in memory and never permanently stored on disk.
    """
    # 1. Content-Type Validation
    valid_content_types = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "application/pdf"
    ]
    filename = file.filename or "uploaded_document"
    content_type = file.content_type or ""

    if content_type.lower() not in valid_content_types and not any(
        filename.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{content_type}'. Supported formats: JPG, PNG, WEBP, PDF."
        )

    # 2. Read and Size Validation (Stream in memory)
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )
    finally:
        await file.close()

    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum permitted limit of {settings.MAX_FILE_SIZE_MB}MB."
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    # 3. Convert bytes into image pages
    try:
        images = bytes_to_images(file_bytes, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to decode document: {str(e)}"
        )

    # 4. Preprocess images & run OCR engine
    engine = OcrEngine.get_instance()
    ocr_pages_data = []

    for idx, raw_image in enumerate(images):
        try:
            preprocessed = preprocess_image(
                raw_image,
                step_name_prefix=f"page_{idx + 1}",
                debug_save=settings.DEBUG_SAVE_IMAGES
            )
            page_ocr_result = engine.ocr_image(preprocessed)
            ocr_pages_data.append(page_ocr_result)
        except Exception as e:
            print(f"Error processing page {idx + 1}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OCR execution failed on page {idx + 1}: {str(e)}"
            )

    # 5. Parse structured invoice fields
    try:
        extracted = parse_ocr_results(ocr_pages_data)
        return extracted
    except Exception as e:
        print(f"Error parsing OCR results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse OCR text: {str(e)}"
        )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
