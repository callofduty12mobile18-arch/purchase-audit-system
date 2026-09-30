import os
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import cv2
import numpy as np
from typing import Tuple, List, Optional
from config import settings


def resize_image_if_needed(
    image: np.ndarray,
    target_width: int = 1800,
    max_dim: int = 2600,
    min_dim: int = 1200
) -> np.ndarray:
    """
    Standardize image dimensions to optimal resolution for OCR detection.
    Downscales oversized photos (>2600px) and upscales undersized scans (<1200px).
    """
    if image is None or image.size == 0:
        return image

    h, w = image.shape[:2]
    max_side = max(h, w)
    min_side = min(h, w)

    if max_side > max_dim:
        scale = max_dim / float(max_side)
        new_w, new_h = int(w * scale), int(h * scale)
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    elif min_side < min_dim:
        scale = float(min_dim) / float(min_side)
        new_w, new_h = int(w * scale), int(h * scale)
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    return image


def order_quad_points(pts: np.ndarray) -> np.ndarray:
    """
    Order coordinates of a 4-point quadrilateral in the sequence:
    top-left, top-right, bottom-right, bottom-left.
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left has smallest sum
    rect[2] = pts[np.argmax(s)]  # bottom-right has largest sum

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right has smallest diff
    rect[3] = pts[np.argmax(diff)]  # bottom-left has largest diff
    return rect


def correct_perspective_quad(
    image: np.ndarray,
    min_area_ratio: float = 0.25
) -> np.ndarray:
    """
    Detects paper/invoice document boundaries in mobile photos and applies
    a 4-point perspective warp. If no clean quadrilateral is found, returns original image.
    """
    if image is None or image.size == 0:
        return image

    h, w = image.shape[:2]
    total_area = float(h * w)

    # Convert to grayscale and apply bilateral filter to remove noise while keeping edges
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 200)

    # Dilate edges to close broken lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edged, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return image

    # Sort contours by area descending
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    doc_contour = None

    for c in contours:
        area = cv2.contourArea(c)
        if area < total_area * min_area_ratio:
            continue

        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        if len(approx) == 4 and cv2.isContourConvex(approx):
            doc_contour = approx.reshape(4, 2)
            break

    if doc_contour is None:
        return image

    # Perform 4-point perspective transform
    ordered_pts = order_quad_points(doc_contour)
    (tl, tr, br, bl) = ordered_pts

    # Compute width of new image
    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_width = max(int(width_a), int(width_b))

    # Compute height of new image
    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_height = max(int(height_a), int(height_b))

    if max_width < 200 or max_height < 200:
        return image

    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(ordered_pts, dst)
    warped = cv2.warpPerspective(
        image, M, (max_width, max_height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )
    return warped


def remove_shadows_and_illumination(image: np.ndarray) -> np.ndarray:
    """
    Normalizes uneven lighting, flash gradients, and shadows across document pages
    using morphological background division.
    """
    if image is None or image.size == 0:
        return image

    if len(image.shape) == 3:
        # Process each BGR channel separately to preserve color fidelity
        channels = cv2.split(image)
        norm_channels = []
        for ch in channels:
            dilated = cv2.dilate(ch, np.ones((11, 11), np.uint8))
            bg = cv2.medianBlur(dilated, 21)
            diff = 255 - cv2.absdiff(ch, bg)
            norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)
            norm_channels.append(norm)
        return cv2.merge(norm_channels)
    else:
        dilated = cv2.dilate(image, np.ones((11, 11), np.uint8))
        bg = cv2.medianBlur(dilated, 21)
        diff = 255 - cv2.absdiff(image, bg)
        return cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)


def enhance_contrast_clahe(image: np.ndarray, clip_limit: float = 2.0) -> np.ndarray:
    """
    Enhance local micro-contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization).
    Optimized for dot-matrix and low-contrast thermal receipts.
    """
    if image is None or image.size == 0:
        return image

    if len(image.shape) == 3:
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        merged = cv2.merge((cl, a, b))
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    else:
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
        return clahe.apply(image)


def deskew_image(image: np.ndarray, max_deskew_angle: float = 30.0) -> np.ndarray:
    """
    Detects text orientation angle and rotates the image horizontally.
    Handles skew between -30 and +30 degrees.
    """
    if image is None or image.size == 0:
        return image

    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    # Binarize with Otsu threshold
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]

    # Dilate horizontally to connect words into lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 3))
    dilated = cv2.dilate(thresh, kernel, iterations=1)

    coords = np.column_stack(np.where(dilated > 0))
    if len(coords) < 100:
        return image

    # Compute minimum bounding rectangle
    rect = cv2.minAreaRect(coords)
    angle = rect[-1]

    # Normalize OpenCV angle convention (-90 to 0 or 0 to 90 depending on version)
    if angle < -45:
        angle = -(90 + angle)
    elif angle > 45:
        angle = 90 - angle
    else:
        angle = -angle

    # Only deskew if angle is significant and within reasonable limits
    if 0.5 < abs(angle) <= max_deskew_angle:
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            image, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        return rotated

    return image


def preprocess_image(
    image: np.ndarray,
    step_name_prefix: str = "doc",
    enable_perspective: bool = True,
    enable_shadow_removal: bool = True,
    enable_clahe: bool = True,
    enable_deskew: bool = True,
    debug_save: bool = False
) -> np.ndarray:
    """
    Full OpenCV preprocessing pipeline for purchase invoices and receipts:
    1. Initial resize to working bounding box
    2. Document edge & perspective quadrilateral correction
    3. Shadow & illumination gradient flattening
    4. CLAHE contrast enhancement
    5. Deskewing to horizontal alignment
    6. Final resolution standardization
    """
    if image is None or image.size == 0:
        return image

    debug_enabled = debug_save or settings.DEBUG_SAVE_IMAGES
    if debug_enabled:
        os.makedirs(settings.DEBUG_DIR, exist_ok=True)
        cv2.imwrite(os.path.join(settings.DEBUG_DIR, f"{step_name_prefix}_0_original.png"), image)

    processed = image

    # 1. Resize if huge
    processed = resize_image_if_needed(processed)
    if debug_enabled:
        cv2.imwrite(os.path.join(settings.DEBUG_DIR, f"{step_name_prefix}_1_resized.png"), processed)

    # 2. Perspective correction
    if enable_perspective:
        processed = correct_perspective_quad(processed)
        if debug_enabled:
            cv2.imwrite(os.path.join(settings.DEBUG_DIR, f"{step_name_prefix}_2_perspective.png"), processed)

    # 3. Shadow and lighting normalization
    if enable_shadow_removal:
        processed = remove_shadows_and_illumination(processed)
        if debug_enabled:
            cv2.imwrite(os.path.join(settings.DEBUG_DIR, f"{step_name_prefix}_3_shadow_removed.png"), processed)

    # 4. CLAHE local contrast
    if enable_clahe:
        processed = enhance_contrast_clahe(processed)
        if debug_enabled:
            cv2.imwrite(os.path.join(settings.DEBUG_DIR, f"{step_name_prefix}_4_clahe.png"), processed)

    # 5. Deskew
    if enable_deskew:
        processed = deskew_image(processed)
        if debug_enabled:
            cv2.imwrite(os.path.join(settings.DEBUG_DIR, f"{step_name_prefix}_5_deskewed.png"), processed)

    return processed
