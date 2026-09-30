import os
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import io
import pymupdf as fitz
import cv2
import numpy as np
from typing import List, Tuple, Any, Optional
from paddleocr import PaddleOCR
from config import settings
from preprocessing import preprocess_image


class OcrEngine:
    _instance: Optional["OcrEngine"] = None
    _ocr: Optional[PaddleOCR] = None

    @classmethod
    def get_instance(cls) -> "OcrEngine":
        if cls._instance is None:
            cls._instance = OcrEngine()
        return cls._instance

    def initialize(self):
        """Initialize PaddleOCR model once during application startup."""
        if self._ocr is None:
            print(f"Loading PaddleOCR model (lang={settings.OCR_LANG}, angle_cls={settings.USE_ANGLE_CLS})...")
            try:
                self._ocr = PaddleOCR(
                    use_angle_cls=settings.USE_ANGLE_CLS,
                    lang=settings.OCR_LANG,
                    show_log=False
                )
            except TypeError:
                self._ocr = PaddleOCR(
                    use_angle_cls=settings.USE_ANGLE_CLS,
                    lang=settings.OCR_LANG
                )
            print("PaddleOCR model successfully initialized.")

    @property
    def is_ready(self) -> bool:
        return self._ocr is not None

    def ocr_image(self, image: np.ndarray) -> List[Tuple[List[List[float]], Tuple[str, float]]]:
        """
        Run OCR on an OpenCV BGR numpy image.
        Returns list of [bounding_box, (text, confidence)].
        """
        if self._ocr is None:
            self.initialize()

        try:
            result = self._ocr.ocr(image, cls=settings.USE_ANGLE_CLS)
        except TypeError:
            result = self._ocr.ocr(image)

        if not result or result[0] is None:
            return []

        return result[0]



def pdf_bytes_to_images(pdf_bytes: bytes, dpi: int = 200) -> List[np.ndarray]:
    """
    Convert in-memory PDF bytes to list of OpenCV BGR images using PyMuPDF (fitz).
    No poppler installation needed.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images: List[np.ndarray] = []

    # Zoom matrix for DPI resolution (72 standard points per inch)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        pix = page.get_pixmap(matrix=mat, alpha=False)
        # Convert pixmap buffer to numpy array
        img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.h, pix.w, pix.n))
        # Convert RGB to BGR for OpenCV / PaddleOCR compatibility
        bgr_image = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        images.append(bgr_image)

    doc.close()
    return images


def bytes_to_images(file_bytes: bytes, filename: str) -> List[np.ndarray]:
    """Convert uploaded file bytes (PDF or image) into a list of OpenCV BGR images."""
    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):
        return pdf_bytes_to_images(file_bytes)
    else:
        # Standard raster image (JPG, PNG, WEBP)
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Could not decode image file: {filename}")
        return [img]
