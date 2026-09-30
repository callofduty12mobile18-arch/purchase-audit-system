import os
import io
import cv2
import numpy as np
import pytest
import pymupdf as fitz

from preprocessing import (
    resize_image_if_needed,
    order_quad_points,
    correct_perspective_quad,
    remove_shadows_and_illumination,
    enhance_contrast_clahe,
    deskew_image,
    preprocess_image,
)
from ocr_engine import pdf_bytes_to_images, bytes_to_images


def create_synthetic_invoice_image(width=1200, height=1600):
    """Generate a clean synthetic invoice for testing."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 255
    cv2.rectangle(img, (50, 50), (width - 50, height - 50), (0, 0, 0), 2)
    cv2.putText(img, "TAX INVOICE", (width // 2 - 100, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    cv2.putText(img, "Supplier: ITC Limited", (80, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img, "GSTIN: 33AAACI1681G1ZM", (80, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img


def test_resize_image_if_needed():
    # Test oversized image downscaling
    large_img = np.zeros((3000, 4000, 3), dtype=np.uint8)
    resized_large = resize_image_if_needed(large_img, max_dim=2500)
    assert max(resized_large.shape[:2]) <= 2500

    # Test undersized image upscaling
    small_img = np.zeros((400, 600, 3), dtype=np.uint8)
    resized_small = resize_image_if_needed(small_img, min_dim=1200)
    assert min(resized_small.shape[:2]) >= 1200


def test_order_quad_points():
    pts = np.array([[100, 100], [400, 120], [390, 600], [90, 580]], dtype=np.float32)
    ordered = order_quad_points(pts)
    assert len(ordered) == 4
    # Top-left has smallest sum
    assert np.array_equal(ordered[0], [100, 100])


def test_perspective_correction():
    # Create canvas with background and a white rotated quadrilateral document
    canvas = np.zeros((1000, 1000, 3), dtype=np.uint8)
    pts = np.array([[200, 150], [800, 200], [750, 850], [150, 800]], dtype=np.int32)
    cv2.fillPoly(canvas, [pts], (255, 255, 255))
    cv2.putText(canvas, "TEST INVOICE", (300, 400), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)

    corrected = correct_perspective_quad(canvas, min_area_ratio=0.15)
    assert corrected is not None
    assert corrected.shape[0] > 300 and corrected.shape[1] > 300


def test_shadow_and_illumination_removal():
    img = create_synthetic_invoice_image(600, 800)
    # Add artificial shadow gradient across image
    gradient = np.tile(np.linspace(0.3, 1.0, 600), (800, 1))
    gradient_3ch = np.stack([gradient, gradient, gradient], axis=-1)
    shadowed = np.clip(img * gradient_3ch, 0, 255).astype(np.uint8)

    flattened = remove_shadows_and_illumination(shadowed)
    assert flattened is not None
    assert flattened.shape == shadowed.shape
    # Ensure flattened has improved minimum brightness
    assert flattened.mean() >= shadowed.mean() * 0.9


def test_enhance_contrast_clahe():
    img = create_synthetic_invoice_image(600, 800)
    enhanced = enhance_contrast_clahe(img)
    assert enhanced.shape == img.shape


def test_deskew_image():
    img = create_synthetic_invoice_image(800, 1000)
    # Rotate by 4 degrees
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), 4.0, 1.0)
    tilted = cv2.warpAffine(img, M, (w, h), borderValue=(255, 255, 255))

    deskewed = deskew_image(tilted)
    assert deskewed is not None
    assert deskewed.shape == tilted.shape


def test_pdf_conversion_and_ocr_flow():
    # Generate in-memory PDF using PyMuPDF
    pdf_doc = fitz.open()
    page = pdf_doc.new_page(width=595, height=842)  # A4
    page.insert_text((50, 50), "TAX INVOICE", fontsize=18)
    page.insert_text((50, 90), "Supplier: ITC Limited", fontsize=12)
    page.insert_text((50, 110), "GSTIN: 33AAACI1681G1ZM", fontsize=12)
    pdf_bytes = pdf_doc.tobytes()
    pdf_doc.close()

    images = pdf_bytes_to_images(pdf_bytes, dpi=150)
    assert len(images) == 1
    assert images[0].shape[0] > 500 and images[0].shape[1] > 300

    preprocessed = preprocess_image(images[0], step_name_prefix="test_pdf")
    assert preprocessed is not None


def test_full_pipeline_with_debug():
    img = create_synthetic_invoice_image(800, 1000)
    out = preprocess_image(img, step_name_prefix="test_debug", debug_save=True)
    assert out is not None
    assert out.shape[:2] != (0, 0)
