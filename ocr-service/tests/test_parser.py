import pytest
from parser import (
    normalize_date,
    extract_gstin,
    extract_spatial_lines,
    parse_line_items_from_lines,
    parse_ocr_results,
)
from schemas import ExtractedOcrInvoice


def test_normalize_date():
    assert normalize_date("Invoice Date: 05/08/2026") == "2026-08-05"
    assert normalize_date("Dated: 05-08-2026") == "2026-08-05"
    assert normalize_date("Date: 2026/08/05") == "2026-08-05"
    assert normalize_date("Bill Date: 05 Aug 2026") == "2026-08-05"
    assert normalize_date("Invalid date here") is None


def test_extract_gstin():
    text_with_gstin = "GSTIN / UIN: 33AAACI1681G1ZM State: Tamil Nadu"
    assert extract_gstin(text_with_gstin) == "33AAACI1681G1ZM"

    text_no_gstin = "No tax id mentioned"
    assert extract_gstin(text_no_gstin) is None


def test_extract_spatial_lines():
    # Simulate PaddleOCR output with two words on same line and one word on next line
    raw_ocr = [
        [
            # Line 1: Word 2 (x=200..300, y=50..70)
            ([[200.0, 50.0], [300.0, 50.0], [300.0, 70.0], [200.0, 70.0]], ("Enterprises", 0.95)),
            # Line 1: Word 1 (x=50..150, y=50..70)
            ([[50.0, 50.0], [150.0, 50.0], [150.0, 70.0], [50.0, 70.0]], ("Ayyappa", 0.98)),
            # Line 2: GSTIN (x=50..300, y=90..110)
            ([[50.0, 90.0], [300.0, 90.0], [300.0, 110.0], [50.0, 110.0]], ("GSTIN: 33AAACI1681G1ZM", 0.96)),
        ]
    ]

    lines = extract_spatial_lines(raw_ocr)
    assert len(lines) == 2
    # Check that Line 1 grouped and sorted left-to-right: "Ayyappa Enterprises"
    assert lines[0]["text"] == "Ayyappa Enterprises"
    assert lines[1]["text"] == "GSTIN: 33AAACI1681G1ZM"


def test_parse_synthetic_invoice():
    # Build complete realistic invoice OCR structure
    mock_ocr = [
        [
            ([[50, 20], [250, 20], [250, 40], [50, 40]], ("TAX INVOICE", 0.99)),
            ([[50, 50], [350, 50], [350, 75], [50, 75]], ("Sri Meenakshi Traders", 0.98)),
            ([[50, 85], [300, 85], [300, 105], [50, 105]], ("GSTIN: 33ABCDE1234F1Z5", 0.97)),
            ([[50, 115], [250, 115], [250, 135], [50, 135]], ("Invoice No: INV-2026-089", 0.96)),
            ([[300, 115], [450, 115], [450, 135], [300, 135]], ("Date: 15/09/2026", 0.95)),

            # Table Header
            ([[50, 160], [500, 160], [500, 180], [50, 180]], ("SNo Description HSN Qty Rate Taxable Total", 0.94)),

            # Table Line Item 1
            ([[50, 190], [500, 190], [500, 210], [50, 210]], ("1 Aashirvaad Atta 5kg 1905 10 PCS 200.00 2000.00 2100.00", 0.95)),

            # Table Line Item 2
            ([[50, 220], [500, 220], [500, 240], [50, 240]], ("2 Sunfeast Dark Fantasy 1905 20 PAC 30.00 600.00 630.00", 0.93)),

            # Summary Totals
            ([[50, 280], [300, 280], [300, 300], [50, 300]], ("Taxable Amount: 2600.00", 0.96)),
            ([[50, 310], [250, 310], [250, 330], [50, 330]], ("CGST: 65.00", 0.95)),
            ([[300, 310], [500, 310], [500, 330], [300, 330]], ("SGST: 65.00", 0.95)),
            ([[50, 340], [300, 340], [300, 360], [50, 360]], ("Grand Total: 2730.00", 0.98)),
        ]
    ]

    result = parse_ocr_results(mock_ocr)

    assert isinstance(result, ExtractedOcrInvoice)
    assert result.supplier_name == "Sri Meenakshi Traders"
    assert result.supplier_gstin == "33ABCDE1234F1Z5"
    assert result.invoice_number == "INV-2026-089"
    assert result.invoice_date == "2026-09-15"
    assert len(result.items) == 2
    assert result.taxable_amount == 2600.00
    assert result.cgst == 65.00
    assert result.sgst == 65.00
    assert result.grand_total == 2730.00
    assert result.field_confidence is not None
    assert result.field_confidence.supplier_name is not None
    assert result.field_confidence.grand_total is not None
    assert result.overall_confidence > 0.8


def test_parse_interstate_invoice():
    mock_ocr = [
        [
            ([[50, 50], [350, 50], [350, 75], [50, 75]], ("ITC Limited Bangalore Branch", 0.98)),
            ([[50, 85], [300, 85], [300, 105], [50, 105]], ("GSTIN: 29AAACI1681G1ZM", 0.99)),  # Karnataka state code 29
            ([[50, 115], [250, 115], [250, 135], [50, 135]], ("Invoice No: BLR/2026/99", 0.96)),
            ([[300, 115], [450, 115], [450, 135], [300, 135]], ("Date: 2026-10-01", 0.95)),
            ([[50, 160], [500, 160], [500, 180], [50, 180]], ("Item HSN Qty Rate Taxable Total", 0.94)),
            ([[50, 190], [500, 190], [500, 210], [50, 210]], ("Classmate Notebook 4820 50 PCS 40.00 2000.00 2240.00", 0.95)),
            ([[50, 280], [300, 280], [300, 300], [50, 300]], ("Taxable Value: 2000.00", 0.96)),
            ([[50, 310], [250, 310], [250, 330], [50, 330]], ("IGST: 240.00", 0.95)),
            ([[50, 340], [300, 340], [300, 360], [50, 360]], ("Grand Total: 2240.00", 0.98)),
        ]
    ]

    result = parse_ocr_results(mock_ocr)
    assert result.supplier_name == "ITC Limited Bangalore Branch"
    assert result.supplier_gstin == "29AAACI1681G1ZM"
    assert result.igst == 240.00
    assert result.cgst == 0.0
    assert result.sgst == 0.0
    assert result.grand_total == 2240.00
    assert len(result.items) == 1
    assert result.items[0].igst == 240.00


def test_parse_empty_or_degraded_ocr():
    # When OCR returns nothing or unparseable lines, never hallucinate values
    empty_ocr = [[]]
    result = parse_ocr_results(empty_ocr)
    assert result.supplier_name == ""
    assert result.supplier_gstin is None
    assert result.invoice_number == ""
    assert result.grand_total == 0.0
    assert len(result.items) == 0
    assert result.overall_confidence == 0.0
