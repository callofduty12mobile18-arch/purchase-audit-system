import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def create_synthetic_sample_invoice_image() -> bytes:
    """Create an in-memory sample invoice image for OCR testing."""
    img = np.ones((800, 1000, 3), dtype=np.uint8) * 255

    # Draw header text
    cv2.putText(img, "AYYAPPA ENTERPRISES", (50, 70), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    cv2.putText(img, "GSTIN: 33AABFA2949R1Z5", (50, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Invoice No: CI/26-27/004387", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Date: 05/08/2026", (50, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

    # Line item & totals
    cv2.putText(img, "Item: Gold Flake Sleeks 16s", (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Taxable Value: 55328.57", (50, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "CGST: 11065.71", (50, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "SGST: 11065.71", (50, 390), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Grand Total: 70036.00", (50, 440), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)

    success, encoded = cv2.imencode(".png", img)
    assert success
    return encoded.tobytes()


def test_ocr_invoice_extraction():
    img_bytes = create_synthetic_sample_invoice_image()

    response = client.post(
        "/ocr/invoice",
        files={"file": ("sample_bill.png", img_bytes, "image/png")}
    )

    assert response.status_code == 200
    data = response.json()

    assert "supplier_name" in data
    assert "invoice_number" in data
    assert "invoice_date" in data
    assert "grand_total" in data
    assert "raw_text" in data
    assert data["raw_text"] is not None and len(data["raw_text"]) > 0

    print("\n[TEST RESULT] Extracted OCR Data:")
    print(f"Supplier Name: {data.get('supplier_name')}")
    print(f"Supplier GSTIN: {data.get('supplier_gstin')}")
    print(f"Invoice Number: {data.get('invoice_number')}")
    print(f"Invoice Date: {data.get('invoice_date')}")
    print(f"Grand Total: {data.get('grand_total')}")
    print(f"Overall Confidence: {data.get('overall_confidence')}")
    print(f"Raw Text Sample: {data.get('raw_text')[:100]}...")
