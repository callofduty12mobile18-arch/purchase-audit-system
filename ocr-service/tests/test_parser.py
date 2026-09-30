import pytest
from parser import (
    normalize_date,
    extract_gstin,
    extract_spatial_lines,
    parse_line_items_from_lines,
    parse_ocr_results,
    parse_robust_number,
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


def test_parse_robust_number():
    # OCR typo corrections
    assert parse_robust_number("1,O0") == 1.00
    assert parse_robust_number("O.20") == 0.20
    assert parse_robust_number("6,O0") == 6.00
    assert parse_robust_number("69,940.51") == 69940.51
    assert parse_robust_number("4,315.56") == 4315.56
    assert parse_robust_number("4315,56") == 4315.56
    assert parse_robust_number("₹127.00") == 127.00
    assert parse_robust_number("Rs. 69940.51") == 69940.51
    assert parse_robust_number("40%") == 40.0
    assert parse_robust_number("l00", is_integer=True) == 100
    assert parse_robust_number("InvalidString") is None


def test_extract_spatial_lines():
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
    assert lines[0]["text"] == "Ayyappa Enterprises"
    assert lines[1]["text"] == "GSTIN: 33AAACI1681G1ZM"


def test_parse_synthetic_invoice():
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
    empty_ocr = [[]]
    result = parse_ocr_results(empty_ocr)
    assert result.supplier_name == ""
    assert result.supplier_gstin is None
    assert result.invoice_number == ""
    assert result.grand_total == 0.0
    assert len(result.items) == 0
    assert result.overall_confidence == 0.0


# ==============================================================================
# STEP 15: REAL INVOICE DATA AUTOMATED TESTS
# Tests the 5 real-world FMCG items with exact quantities, MRP, packs, amounts
# and deterministic each_pack_rate = round(invoice_amount / pack_qty, 2)
# ==============================================================================

def test_real_invoice_items_step15():
    """
    Test extraction of the 5 required FMCG items:
    1. CI Ice Burst 10M 10BE -> Qty: 0.2, MRP/RSP: 240, Pack Qty: 20, Amount: 4315.56, Each Pack: 215.78
    2. NC DLX FT 10BE (MD+NPCT)-FF -> Qty: 0.5, MRP/RSP: 125, Pack Qty: 50, Amount: 5704.36, Each Pack: 114.09
    3. GOLD FL FT-10BE MD+NPCT-FF -> Qty: 6, MRP/RSP: 127, Pack Qty: 600, Amount: 69940.51, Each Pack: 116.57
    4. SCISSORS FT 10BE-NB-MD1-NP -> Qty: 2.5, MRP/RSP: 109, Pack Qty: 250, Amount: 24925.59, Each Pack: 99.70
    5. FLAKE GOLD CREST 10HL 70 -> Qty: 5, MRP/RSP: 70, Pack Qty: 500, Amount: 31994.05, Each Pack: 63.99
    """
    mock_ocr = [
        [
            ([[50, 20], [350, 20], [350, 45], [50, 45]], ("AYYAPPA ENTERPRISES", 0.99)),
            ([[50, 50], [300, 50], [300, 70], [50, 70]], ("GSTIN: 33AABFA2949R1Z5", 0.98)),
            ([[50, 80], [250, 80], [250, 100], [50, 100]], ("Invoice No: CI26-27/006288", 0.97)),
            ([[300, 80], [450, 80], [450, 100], [300, 100]], ("Date: 29/09/2026", 0.96)),

            # Table Header
            ([[50, 130], [800, 130], [800, 150], [50, 150]], ("Item Description HSN RSP/PAC Rate Qty PACQty Amount", 0.95)),

            # Item 1
            ([[50, 160], [800, 160], [800, 180], [50, 180]], ("CI Ice Burst 10M 10BE 24022090 240.00 215.78 0.2 20 4315.56", 0.96)),

            # Item 2
            ([[50, 190], [800, 190], [800, 210], [50, 210]], ("NC DLX FT 10BE (MD+NPCT)-FF 24022090 125.00 114.09 0.5 50 5704.36", 0.96)),

            # Item 3
            ([[50, 220], [800, 220], [800, 240], [50, 240]], ("GOLD FL FT-10BE MD+NPCT-FF 24022090 127.00 116.57 6 600 69940.51", 0.97)),

            # Item 4
            ([[50, 250], [800, 250], [800, 270], [50, 270]], ("SCISSORS FT 10BE-NB-MD1-NP 24022090 109.00 99.70 2.5 250 24925.59", 0.96)),

            # Item 5
            ([[50, 280], [800, 280], [800, 300], [50, 300]], ("FLAKE GOLD CREST 10HL 70 24022090 70.00 63.99 5 500 31994.05", 0.96)),

            # Summary Totals
            ([[50, 340], [400, 340], [400, 360], [50, 360]], ("Taxable Amount: 97771.48", 0.96)),
            ([[50, 370], [300, 370], [300, 390], [50, 390]], ("CGST: 19554.30", 0.95)),
            ([[320, 370], [550, 370], [550, 390], [320, 390]], ("SGST: 19554.30", 0.95)),
            ([[50, 400], [400, 400], [400, 420], [50, 420]], ("Grand Total: 136880.07", 0.98)),
        ]
    ]

    result = parse_ocr_results(mock_ocr)

    assert result.supplier_name == "AYYAPPA ENTERPRISES"
    assert result.supplier_gstin == "33AABFA2949R1Z5"
    assert result.invoice_number == "CI26-27/006288"
    assert result.invoice_date == "2026-09-29"
    assert len(result.items) == 5

    # 1. CI Ice Burst 10M 10BE
    it1 = result.items[0]
    assert "Ice Burst 10M" in it1.item_name
    assert it1.qty == 0.2
    assert it1.mrp_rsp == 240.00
    assert it1.pack_qty == 20
    assert it1.invoice_amount == 4315.56
    assert it1.each_pack_rate == 215.78

    # 2. NC DLX FT 10BE (MD+NPCT)-FF
    it2 = result.items[1]
    assert "NC DLX" in it2.item_name
    assert it2.qty == 0.5
    assert it2.mrp_rsp == 125.00
    assert it2.pack_qty == 50
    assert it2.invoice_amount == 5704.36
    assert it2.each_pack_rate == 114.09

    # 3. GOLD FL FT-10BE MD+NPCT-FF
    it3 = result.items[2]
    assert "GOLD FL" in it3.item_name
    assert it3.qty == 6.0
    assert it3.mrp_rsp == 127.00
    assert it3.pack_qty == 600
    assert it3.invoice_amount == 69940.51
    assert it3.each_pack_rate == 116.57

    # 4. SCISSORS FT 10BE-NB-MD1-NP
    it4 = result.items[3]
    assert "SCISSORS" in it4.item_name
    assert it4.qty == 2.5
    assert it4.mrp_rsp == 109.00
    assert it4.pack_qty == 250
    assert it4.invoice_amount == 24925.59
    assert it4.each_pack_rate == 99.70

    # 5. FLAKE GOLD CREST 10HL 70
    it5 = result.items[4]
    assert "FLAKE GOLD CREST" in it5.item_name
    assert it5.qty == 5.0
    assert it5.mrp_rsp == 70.00
    assert it5.pack_qty == 500
    assert it5.invoice_amount == 31994.05
    assert it5.each_pack_rate == 63.99


def test_multiline_item_wrapping():
    """Test that wrapped item description lines are cleanly merged into one item."""
    mock_ocr = [
        [
            ([[50, 50], [350, 50], [350, 75], [50, 75]], ("AYYAPPA ENTERPRISES", 0.98)),
            ([[50, 85], [300, 85], [300, 105], [50, 105]], ("Invoice No: CI-9988", 0.96)),
            ([[50, 120], [500, 120], [500, 140], [50, 140]], ("Item HSN RSP Qty Packs Total", 0.95)),

            # Line 1: Main item description part 1
            ([[50, 150], [250, 150], [250, 170], [50, 170]], ("NC DLX FT 10BE", 0.96)),
            # Line 2: Continuation description + numeric columns
            ([[50, 175], [500, 175], [500, 195], [50, 195]], ("(MD+NPCT)-FF 24022090 125.00 0.5 50 5704.36", 0.96)),

            ([[50, 240], [300, 240], [300, 260], [50, 260]], ("Grand Total: 5704.36", 0.98)),
        ]
    ]

    result = parse_ocr_results(mock_ocr)
    assert len(result.items) == 1
    item = result.items[0]
    # Check that description parts were merged
    assert "NC DLX FT 10BE" in item.item_name
    assert "(MD+NPCT)-FF" in item.item_name
    assert item.qty == 0.5
    assert item.pack_qty == 50
    assert item.mrp_rsp == 125.00
    assert item.invoice_amount == 5704.36
    assert item.each_pack_rate == 114.09
