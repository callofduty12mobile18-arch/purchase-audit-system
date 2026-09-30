import os
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import re
from datetime import datetime
from typing import List, Tuple, Dict, Any, Optional
from schemas import ExtractedOcrInvoice, ExtractedOcrItem, FieldConfidence


# Common date parsing patterns
DATE_PATTERNS = [
    (r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b", "%d/%m/%Y"),      # 05/08/2026, 05-08-2026, 05.08.2026
    (r"\b(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})\b", "%Y/%m/%d"),      # 2026/08/05, 2026-08-05
    (r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2})\b", "%d/%m/%y"),        # 05/08/26, 05-08-26
    (r"\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,\-]+(\d{4})\b", "%d %b %Y"), # 05 Aug 2026
    (r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[\s,\-]+(\d{4})\b", "%b %d %Y"), # Aug 05 2026
]

# Indian GSTIN Regex (15 characters: 2 state digits + 10 PAN chars + 1 entity digit + 'Z' + 1 checksum char)
GSTIN_REGEX = re.compile(r"\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b", re.IGNORECASE)

# Invoice Number search patterns
INVOICE_EXPLICIT_PATTERNS = [
    re.compile(r"(?:invoice\s*(?:no|num|number|#)|bill\s*(?:no|#)|inv\s*(?:no|#|num))\s*[:\-\s]*([A-Za-z0-9/\-_]+)", re.IGNORECASE),
]

INVOICE_FALLBACK_PATTERNS = [
    re.compile(r"\b(CI/\d{2}-\d{2}/\d+)\b", re.IGNORECASE),
    re.compile(r"\b(INV[/\-_][A-Za-z0-9/\-_]{2,20})\b", re.IGNORECASE),
    re.compile(r"\b([A-Z]{1,5}/\d{2,4}[A-Za-z0-9/\-_]+)\b"),
]

# Common UOM patterns in FMCG and Indian B2B
UOM_PATTERNS = [
    "PCS", "PAC", "PACK", "PACKS", "BOX", "BOXES", "NOS", "NO", "KGS", "KG",
    "GM", "GMS", "LTR", "LTRS", "ML", "BTL", "BOTTLE", "CASE", "CS", "DOZ", "SET", "BAG", "TIN"
]

NUMBER_REGEX = re.compile(r"[-+]?\d{1,3}(?:,\d{3})*(?:\.\d{2})|[-+]?\d+\.\d{2}")
INTEGER_REGEX = re.compile(r"\b\d+\b")


def normalize_date(text: str) -> Optional[str]:
    """Parse various date formats into standardized YYYY-MM-DD."""
    for pattern, strptime_fmt in DATE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            matched_str = match.group(0).replace(".", "/").replace("-", "/")
            try:
                if "%b" in strptime_fmt:
                    # Clean up commas or multiple spaces for textual date
                    cleaned = re.sub(r"[\s,\-]+", " ", match.group(0)).strip()
                    dt = datetime.strptime(cleaned, strptime_fmt)
                else:
                    clean_pattern_fmt = strptime_fmt.replace(".", "/").replace("-", "/")
                    dt = datetime.strptime(matched_str, clean_pattern_fmt)
                return dt.strftime("%Y-%m-%d")
            except Exception:
                continue
    return None


def extract_gstin(text: str) -> Optional[str]:
    """Find valid 15-character Indian GSTIN."""
    match = GSTIN_REGEX.search(text)
    if match:
        return match.group(1).upper()
    return None


def parse_float(val_str: str) -> float:
    """Safely parse float from string with comma removal."""
    try:
        cleaned = re.sub(r"[^\d.\-+]", "", val_str.replace(",", ""))
        return float(cleaned)
    except Exception:
        return 0.0


def extract_spatial_lines(
    ocr_pages_data: List[List[Tuple[List[List[float]], Tuple[str, float]]]]
) -> List[Dict[str, Any]]:
    """
    Groups OCR bounding boxes by Y-coordinate proximity into coherent spatial lines,
    sorted left-to-right (by X coordinate).
    """
    raw_boxes: List[Dict[str, Any]] = []

    for page_idx, page in enumerate(ocr_pages_data):
        for item in page:
            bbox, (text, conf) = item
            text = text.strip()
            if not text:
                continue
            # Calculate center Y, min Y, max Y, min X, max X
            xs = [pt[0] for pt in bbox]
            ys = [pt[1] for pt in bbox]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            center_y = (min_y + max_y) / 2.0
            height = max_y - min_y

            raw_boxes.append({
                "page": page_idx,
                "text": text,
                "conf": conf,
                "bbox": bbox,
                "min_x": min_x,
                "max_x": max_x,
                "min_y": min_y,
                "max_y": max_y,
                "center_y": center_y,
                "height": height
            })

    # Sort boxes by page, then by Y coordinate
    raw_boxes.sort(key=lambda b: (b["page"], b["center_y"], b["min_x"]))

    # Group into lines
    lines: List[Dict[str, Any]] = []
    current_line_boxes: List[Dict[str, Any]] = []

    for box in raw_boxes:
        if not current_line_boxes:
            current_line_boxes.append(box)
            continue

        prev = current_line_boxes[-1]
        avg_height = sum(b["height"] for b in current_line_boxes) / len(current_line_boxes)
        # If box is on same page and Y is within half of line height, group in same line
        if box["page"] == prev["page"] and abs(box["center_y"] - prev["center_y"]) <= max(12.0, avg_height * 0.55):
            current_line_boxes.append(box)
        else:
            # Finalize previous line
            current_line_boxes.sort(key=lambda b: b["min_x"])
            line_text = " ".join(b["text"] for b in current_line_boxes)
            avg_conf = sum(b["conf"] for b in current_line_boxes) / len(current_line_boxes)
            lines.append({
                "text": line_text,
                "boxes": current_line_boxes,
                "conf": avg_conf,
                "min_y": min(b["min_y"] for b in current_line_boxes),
                "max_y": max(b["max_y"] for b in current_line_boxes),
                "center_y": sum(b["center_y"] for b in current_line_boxes) / len(current_line_boxes)
            })
            current_line_boxes = [box]

    if current_line_boxes:
        current_line_boxes.sort(key=lambda b: b["min_x"])
        line_text = " ".join(b["text"] for b in current_line_boxes)
        avg_conf = sum(b["conf"] for b in current_line_boxes) / len(current_line_boxes)
        lines.append({
            "text": line_text,
            "boxes": current_line_boxes,
            "conf": avg_conf,
            "min_y": min(b["min_y"] for b in current_line_boxes),
            "max_y": max(b["max_y"] for b in current_line_boxes),
            "center_y": sum(b["center_y"] for b in current_line_boxes) / len(current_line_boxes)
        })

    return lines


def parse_line_items_from_lines(
    lines: List[Dict[str, Any]],
    supplier_gstin: Optional[str]
) -> List[ExtractedOcrItem]:
    """
    Extract tabular line items between table header and totals footer.
    Reconstructs description, HSN, quantity, UOM, purchase rate, GST rate, taxable value, and total.
    """
    items: List[ExtractedOcrItem] = []

    # Table header keywords
    header_keywords = [
        "DESCRIPTION", "PARTICULARS", "ITEM NAME", "PRODUCT", "ITEM DESCRIPTION",
        "HSN", "SAC", "QTY", "QUANTITY", "RATE", "PRICE", "AMOUNT", "TAXABLE"
    ]
    # Table footer/end keywords
    footer_keywords = [
        "SUB TOTAL", "SUBTOTAL", "TAXABLE VALUE", "TAXABLE AMT", "TAXABLE AMOUNT",
        "TOTAL TAX", "CGST", "SGST", "IGST", "ROUND OFF", "GRAND TOTAL", "NET AMOUNT",
        "INVOICE VALUE", "TOTAL AMOUNT", "BILL AMOUNT", "AMOUNT IN WORDS",
        "BANK DETAILS", "TERMS & CONDITIONS", "AUTHORISED SIGNATORY", "AUTHORIZED SIGNATORY"
    ]

    header_idx = -1
    footer_idx = len(lines)

    for idx, line in enumerate(lines):
        upper = line["text"].upper()
        # Find start of table
        if header_idx == -1:
            matches = sum(1 for kw in header_keywords if kw in upper)
            if matches >= 2:
                header_idx = idx
        # Find end of table
        elif header_idx != -1 and idx > header_idx:
            if any(kw in upper for kw in footer_keywords):
                footer_idx = idx
                break

    # If no explicit header found, look for candidate lines
    candidate_lines = lines[header_idx + 1:footer_idx] if header_idx != -1 else lines

    for line in candidate_lines:
        text = line["text"].strip()
        upper = text.upper()

        # Skip footer/header keywords if encountered
        if any(kw in upper for kw in footer_keywords) or any(skip in upper for skip in ["PAGE ", "SIGNATORY", "PAN:", "GSTIN:"]):
            continue

        # Extract tokens from line
        tokens = text.split()
        if len(tokens) < 3:
            continue

        # 1. Detect S.No if first token is purely numeric index (e.g., "1", "1.", "2)")
        start_token_idx = 0
        if re.match(r"^\d+[\.\)]?$", tokens[0]):
            start_token_idx = 1

        # 2. Extract HSN (4 to 8 digit token)
        hsn = None
        hsn_token_idx = -1
        for i in range(start_token_idx, len(tokens)):
            if re.match(r"^\d{4,8}$", tokens[i]):
                hsn = tokens[i]
                hsn_token_idx = i
                break

        # 3. Extract UOM
        uom = "PCS"
        uom_token_idx = -1
        for i in range(start_token_idx, len(tokens)):
            clean_tok = re.sub(r"[^A-Z]", "", tokens[i].upper())
            if clean_tok in UOM_PATTERNS:
                uom = clean_tok
                uom_token_idx = i
                break

        # 4. Extract all numeric tokens (integers and decimals)
        numeric_values: List[float] = []
        desc_tokens: List[str] = []

        for i in range(start_token_idx, len(tokens)):
            if i == hsn_token_idx or i == uom_token_idx:
                continue

            tok = tokens[i]
            # Check if token is numeric (e.g., 10, 200.00, 2,000.00, +50)
            cleaned_num_str = tok.replace(",", "")
            if re.match(r"^[-+]?\d+(?:\.\d+)?$", cleaned_num_str):
                val = parse_float(cleaned_num_str)
                numeric_values.append(val)
            else:
                desc_tokens.append(tok)

        if not numeric_values:
            continue

        clean_desc = " ".join(desc_tokens).strip()
        if len(clean_desc) < 2:
            clean_desc = f"Item {len(items) + 1}"

        # 5. Differentiate Qty, Rate, Taxable Value, Total from numeric_values
        qty = 1.0
        rate = 0.0
        taxable = 0.0
        total = 0.0
        gst_rate = 18.0

        if len(numeric_values) >= 4:
            # e.g., [10, 200.00, 2000.00, 2100.00]
            qty = numeric_values[0]
            rate = numeric_values[1]
            taxable = numeric_values[2]
            total = numeric_values[-1]
        elif len(numeric_values) == 3:
            # e.g., [10, 200.00, 2100.00]
            qty = numeric_values[0]
            rate = numeric_values[1]
            taxable = round(qty * rate, 2)
            total = numeric_values[2]
        elif len(numeric_values) == 2:
            rate = numeric_values[0]
            total = numeric_values[1]
            taxable = rate
        elif len(numeric_values) == 1:
            total = numeric_values[0]
            rate = total
            taxable = total

        # Check for GST rate in line text
        gst_match = re.search(r"\b(0|5|12|18|28|40)(?:\.0+)?\s*%", text)
        if gst_match:
            gst_rate = float(gst_match.group(1))
        elif taxable > 0 and total > taxable:
            calculated_gst = round(((total - taxable) / taxable) * 100.0)
            if calculated_gst in [0, 5, 12, 18, 28, 40]:
                gst_rate = float(calculated_gst)

        # Tax calculations
        is_interstate = False
        if supplier_gstin and len(supplier_gstin) >= 2:
            is_interstate = not supplier_gstin.startswith("33")

        tax_amt = max(0.0, round(total - taxable, 2)) if total > taxable else round(taxable * (gst_rate / 100.0), 2)
        if total == 0.0 or total < taxable:
            total = round(taxable + tax_amt, 2)

        cgst = 0.0
        sgst = 0.0
        igst = 0.0
        if is_interstate:
            igst = tax_amt
        else:
            cgst = round(tax_amt / 2.0, 2)
            sgst = round(tax_amt - cgst, 2)

        item = ExtractedOcrItem(
            supplier_item_name=clean_desc,
            hsn=hsn,
            quantity=round(qty, 2),
            uom=uom,
            purchase_rate=round(rate, 2),
            gst_rate=round(gst_rate, 2),
            taxable_value=round(taxable, 2),
            cgst=round(cgst, 2),
            sgst=round(sgst, 2),
            igst=round(igst, 2),
            discount=None,
            total=round(total, 2),
            confidence=round(line["conf"], 2)
        )
        items.append(item)

    return items


def parse_ocr_results(
    ocr_pages_data: List[List[Tuple[List[List[float]], Tuple[str, float]]]]
) -> ExtractedOcrInvoice:
    """
    Parse raw PaddleOCR bounding boxes and text lines into structured ExtractedOcrInvoice.
    """
    # 1. Group spatial lines
    spatial_lines = extract_spatial_lines(ocr_pages_data)

    all_boxes = []
    for page in ocr_pages_data:
        for item in page:
            bbox, (text, conf) = item
            all_boxes.append((bbox, text.strip(), conf))

    raw_text_parts = [b[1] for b in all_boxes if b[1]]
    raw_text = "\n".join(raw_text_parts)

    supplier_name = ""
    supplier_gstin = None
    invoice_number = ""
    invoice_date = datetime.now().strftime("%Y-%m-%d")

    supplier_name_conf = 0.0
    supplier_gstin_conf = 0.0
    invoice_number_conf = 0.0
    invoice_date_conf = 0.0
    grand_total_conf = 0.0

    # 2. Extract Supplier Name
    supplier_keywords = ["ENTERPRISES", "AGENCIES", "TRADERS", "LIMITED", "LTD", "PVT", "CORP", "DISTRIBUTORS", "INDUSTRIES", "COMPANY", "CO.", "STORE", "SALES", "MARKETING"]
    skip_headers = ["TAX INVOICE", "ORIGINAL", "DUPLICATE", "TRIPLICATE", "BILL OF SUPPLY", "RETAIL INVOICE", "CASH MEMO", "INVOICE", "DELIVERY CHALLAN"]

    # Search first 10 spatial lines for supplier
    for line in spatial_lines[:10]:
        text = line["text"]
        upper = text.upper()
        if any(skip in upper for skip in skip_headers):
            continue
        if any(kw in upper for kw in ["GSTIN", "INVOICE NO", "DATE:", "BILL NO", "STATE:"]):
            continue

        if any(kw in upper for kw in supplier_keywords) or len(supplier_name) == 0:
            supplier_name = text
            supplier_name_conf = line["conf"]
            if any(kw in upper for kw in supplier_keywords):
                break

    # 3. Extract GSTIN
    for line in spatial_lines:
        gstin = extract_gstin(line["text"])
        if gstin:
            supplier_gstin = gstin
            supplier_gstin_conf = line["conf"]
            break

    # 4. Extract Invoice Number (Check explicit keywords first)
    for line in spatial_lines:
        text = line["text"]
        for pat in INVOICE_EXPLICIT_PATTERNS:
            match = pat.search(text)
            if match:
                inv_no = match.group(1).strip()
                # Exclude false positives like "TAX", "ORIGINAL", "DATE"
                if len(inv_no) >= 2 and not any(kw in inv_no.upper() for kw in ["DATE", "GSTIN", "TOTAL", "STATE", "SUPPLY", "ORIGINAL", "TAX"]):
                    invoice_number = inv_no
                    invoice_number_conf = line["conf"]
                    break
        if invoice_number:
            break

    if not invoice_number:
        for line in spatial_lines:
            text = line["text"]
            for pat in INVOICE_FALLBACK_PATTERNS:
                match = pat.search(text)
                if match:
                    inv_no = match.group(1).strip()
                    if len(inv_no) >= 3 and not any(kw in inv_no.upper() for kw in ["DATE", "GSTIN", "TOTAL", "STATE", "SUPPLY", "ORIGINAL", "TAX"]):
                        invoice_number = inv_no
                        invoice_number_conf = line["conf"]
                        break
            if invoice_number:
                break

    # 5. Extract Invoice Date
    for line in spatial_lines:
        parsed_d = normalize_date(line["text"])
        if parsed_d:
            invoice_date = parsed_d
            invoice_date_conf = line["conf"]
            break

    # 6. Extract Line Items
    items = parse_line_items_from_lines(spatial_lines, supplier_gstin)

    # 7. Extract Summary Totals & Taxes
    subtotal = 0.0
    taxable_amount = 0.0
    cgst = 0.0
    sgst = 0.0
    igst = 0.0
    round_off = 0.0
    grand_total = 0.0

    for idx, line in enumerate(spatial_lines):
        text = line["text"]
        upper = text.upper()

        if any(kw in upper for kw in ["GRAND TOTAL", "NET AMOUNT", "INVOICE VALUE", "TOTAL AMOUNT", "BILL AMOUNT"]):
            nums = NUMBER_REGEX.findall(text)
            if not nums and idx + 1 < len(spatial_lines):
                nums = NUMBER_REGEX.findall(spatial_lines[idx + 1]["text"])
            if nums:
                val = parse_float(nums[-1])
                if val > grand_total:
                    grand_total = val
                    grand_total_conf = line["conf"]

        elif any(kw in upper for kw in ["TAXABLE VALUE", "TAXABLE AMT", "TAXABLE AMOUNT", "SUB TOTAL", "SUBTOTAL"]):
            nums = NUMBER_REGEX.findall(text)
            if not nums and idx + 1 < len(spatial_lines):
                nums = NUMBER_REGEX.findall(spatial_lines[idx + 1]["text"])
            if nums:
                val = parse_float(nums[-1])
                taxable_amount = val
                subtotal = val

        elif "CGST" in upper and "SGST" not in upper:
            nums = NUMBER_REGEX.findall(text)
            if nums:
                cgst = parse_float(nums[-1])

        elif "SGST" in upper and "CGST" not in upper:
            nums = NUMBER_REGEX.findall(text)
            if nums:
                sgst = parse_float(nums[-1])

        elif "IGST" in upper:
            nums = NUMBER_REGEX.findall(text)
            if nums:
                igst = parse_float(nums[-1])

        elif "ROUND" in upper:
            nums = NUMBER_REGEX.findall(text)
            if nums:
                round_off = parse_float(nums[-1])

    # Reconcile with Line Items if totals are missing or need cross-validation
    if items:
        item_taxable_sum = round(sum(it.taxable_value for it in items), 2)
        item_cgst_sum = round(sum(it.cgst for it in items), 2)
        item_sgst_sum = round(sum(it.sgst for it in items), 2)
        item_igst_sum = round(sum(it.igst for it in items), 2)
        item_total_sum = round(sum(it.total for it in items), 2)

        if taxable_amount == 0.0 and item_taxable_sum > 0:
            taxable_amount = item_taxable_sum
            subtotal = item_taxable_sum

        if cgst == 0.0 and item_cgst_sum > 0:
            cgst = item_cgst_sum
        if sgst == 0.0 and item_sgst_sum > 0:
            sgst = item_sgst_sum
        if igst == 0.0 and item_igst_sum > 0:
            igst = item_igst_sum

        if grand_total == 0.0 and item_total_sum > 0:
            grand_total = item_total_sum
            grand_total_conf = sum(it.confidence for it in items) / len(items)

    total_tax = round(cgst + sgst + igst, 2)

    # Balance Equation Cross-Validation
    if grand_total == 0.0 and taxable_amount > 0:
        grand_total = round(taxable_amount + total_tax + round_off, 2)
    elif taxable_amount == 0.0 and grand_total > 0:
        taxable_amount = round(grand_total - total_tax - round_off, 2)
        subtotal = taxable_amount

    # Compute Overall Confidence
    confidences = [b[2] for b in all_boxes]
    raw_avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    # Balance check bonus
    is_balanced = abs((subtotal + total_tax + round_off) - grand_total) <= 0.05
    balance_factor = 1.0 if is_balanced else 0.9

    overall_confidence = round(min(1.0, raw_avg_conf * balance_factor), 2)

    field_confidence = FieldConfidence(
        supplier_name=round(supplier_name_conf, 2) if supplier_name_conf > 0 else None,
        supplier_gstin=round(supplier_gstin_conf, 2) if supplier_gstin_conf > 0 else None,
        invoice_number=round(invoice_number_conf, 2) if invoice_number_conf > 0 else None,
        invoice_date=round(invoice_date_conf, 2) if invoice_date_conf > 0 else None,
        grand_total=round(grand_total_conf, 2) if grand_total_conf > 0 else None,
    )

    return ExtractedOcrInvoice(
        supplier_name=supplier_name,
        supplier_gstin=supplier_gstin,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        payment_mode="CREDIT",
        payment_status="UNPAID",
        items=items,
        subtotal=round(subtotal, 2),
        taxable_amount=round(taxable_amount, 2),
        cgst=round(cgst, 2),
        sgst=round(sgst, 2),
        igst=round(igst, 2),
        total_tax=total_tax,
        round_off=round(round_off, 2),
        grand_total=round(grand_total, 2),
        overall_confidence=overall_confidence,
        field_confidence=field_confidence,
        raw_text=raw_text
    )
