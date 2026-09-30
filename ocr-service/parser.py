import os
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import re
from datetime import datetime
from typing import List, Tuple, Dict, Any, Optional
from schemas import (
    ExtractedOcrInvoice,
    ExtractedOcrItem,
    FieldConfidence,
    RowValidation,
    InvoiceValidation
)


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
    re.compile(r"\b(CI[0-9A-Z/\-_]{3,25})\b", re.IGNORECASE),
    re.compile(r"\b(INV[/\-_][A-Za-z0-9/\-_]{2,20})\b", re.IGNORECASE),
    re.compile(r"\b([A-Z]{1,5}/\d{2,4}[A-Za-z0-9/\-_]+)\b"),
]

# Common UOM patterns in FMCG and Indian B2B
UOM_PATTERNS = [
    "PCS", "PAC", "PACK", "PACKS", "BOX", "BOXES", "NOS", "NO", "KGS", "KG",
    "GM", "GMS", "LTR", "LTRS", "ML", "BTL", "BOTTLE", "CASE", "CS", "DOZ", "SET", "BAG", "TIN"
]

NUMBER_REGEX = re.compile(r"[-+]?\d{1,3}(?:,\d{3})*(?:\.\d{2})|[-+]?\d+\.\d{2}")


def normalize_date(text: str) -> Optional[str]:
    """Parse various date formats into standardized YYYY-MM-DD."""
    for pattern, strptime_fmt in DATE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            matched_str = match.group(0).replace(".", "/").replace("-", "/")
            try:
                if "%b" in strptime_fmt:
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


def parse_robust_number(token_text: str, is_integer: bool = False) -> Optional[float]:
    """
    Dedicated robust numeric parser that normalizes common OCR errors:
    - Normalizes letter 'O'/'o' -> '0' in numeric contexts (e.g. 'O.20' -> 0.20, '1,O0' -> 1.00, '6,O0' -> 6.00)
    - Normalizes letter 'l', 'I', '|' -> '1' in numeric contexts (e.g. 'l00' -> 100, '|27.00' -> 127.00)
    - Strips currency symbols (₹, Rs, Rs.), commas, %, trailing punctuation
    - Handles comma decimal separators (e.g. '4315,56' -> 4315.56)
    """
    if not token_text:
        return None

    cleaned = token_text.strip()

    # Strip currency and symbols
    cleaned = re.sub(r"[₹$€£]", "", cleaned)
    cleaned = re.sub(r"\b(?:Rs\.?|INR)\b", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = cleaned.rstrip("%")
    cleaned = cleaned.strip(" :;-_*#|()")

    # If completely empty after stripping
    if not cleaned:
        return None

    # Selective OCR character corrections ONLY when surrounded by digits/decimals
    # 1. 'O' or 'o' to '0'
    cleaned = re.sub(r"(?<=\d)[Oo](?=\d|\b)", "0", cleaned)
    cleaned = re.sub(r"(?<=\b)[Oo](?=[.,]\d)", "0", cleaned)
    cleaned = re.sub(r"(?<=[.,])[Oo](?=\d|\b)", "0", cleaned)
    if cleaned.upper() in ["O", "OO"]:
        cleaned = "0"

    # 2. 'l', 'I', '|' to '1' when adjacent to digits or decimal point
    cleaned = re.sub(r"(?<=\d)[lI|](?=\d|\b)", "1", cleaned)
    cleaned = re.sub(r"(?<=\b)[lI|](?=[.,]?\d)", "1", cleaned)
    cleaned = re.sub(r"(?<=[.,])[lI|](?=\d|\b)", "1", cleaned)

    # 3. Handle commas:
    # If standard thousands separator (e.g. 69,940.51 or 1,200), remove comma
    if re.search(r"\d{1,3}(,\d{3})+", cleaned):
        cleaned = cleaned.replace(",", "")
    # If comma used as decimal separator (e.g. 4315,56 or 6,00 and no other dot), replace with dot
    elif re.search(r"^\d+,\d{1,2}$", cleaned):
        cleaned = cleaned.replace(",", ".")
    else:
        cleaned = cleaned.replace(",", "")

    # Clean any trailing dots or dashes
    cleaned = cleaned.strip(". -")

    # Match numeric float
    if re.match(r"^[-+]?\d+(?:\.\d+)?$", cleaned):
        try:
            val = float(cleaned)
            return round(val) if is_integer else val
        except (ValueError, TypeError):
            return None

    return None


def parse_float(val_str: str) -> float:
    """Safely parse float from string with comma removal."""
    num = parse_robust_number(val_str)
    return num if num is not None else 0.0


def extract_sub_tokens_from_box(box_dict: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    If an OCR box contains multiple space-separated words, divide the box horizontally
    proportional to word character lengths so each word has its own spatial coordinates.
    """
    text = box_dict["text"].strip()
    words = text.split()
    if len(words) <= 1:
        return [box_dict]

    total_chars = max(1, sum(len(w) for w in words) + len(words) - 1)
    box_w = max(1.0, box_dict["max_x"] - box_dict["min_x"])
    cur_x = box_dict["min_x"]
    sub_tokens: List[Dict[str, Any]] = []

    for w in words:
        w_w = (len(w) / total_chars) * box_w
        w_min_x = cur_x
        w_max_x = cur_x + w_w
        sub_tokens.append({
            "page": box_dict.get("page", 0),
            "text": w,
            "conf": box_dict.get("conf", 0.9),
            "min_x": w_min_x,
            "max_x": w_max_x,
            "center_x": (w_min_x + w_max_x) / 2.0,
            "min_y": box_dict["min_y"],
            "max_y": box_dict["max_y"],
            "center_y": box_dict["center_y"],
            "height": box_dict["height"]
        })
        cur_x += w_w + (1 / total_chars) * box_w

    return sub_tokens


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
            xs = [pt[0] for pt in bbox]
            ys = [pt[1] for pt in bbox]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            center_x = (min_x + max_x) / 2.0
            center_y = (min_y + max_y) / 2.0
            height = max_y - min_y
            width = max_x - min_x

            raw_boxes.append({
                "page": page_idx,
                "text": text,
                "conf": conf,
                "bbox": bbox,
                "min_x": min_x,
                "max_x": max_x,
                "min_y": min_y,
                "max_y": max_y,
                "center_x": center_x,
                "center_y": center_y,
                "height": height,
                "width": width
            })

    # Sort boxes by page, then vertical center_y, then horizontal center_x
    raw_boxes.sort(key=lambda b: (b["page"], b["center_y"], b["center_x"]))

    # Group into lines
    lines: List[Dict[str, Any]] = []
    current_line_boxes: List[Dict[str, Any]] = []

    for box in raw_boxes:
        if not current_line_boxes:
            current_line_boxes.append(box)
            continue

        prev = current_line_boxes[-1]
        avg_height = sum(b["height"] for b in current_line_boxes) / len(current_line_boxes)
        if box["page"] == prev["page"] and abs(box["center_y"] - prev["center_y"]) <= max(12.0, avg_height * 0.55):
            current_line_boxes.append(box)
        else:
            current_line_boxes.sort(key=lambda b: b["center_x"])
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
        current_line_boxes.sort(key=lambda b: b["center_x"])
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


# ==============================================================================
# SPATIAL TABLE PARSER WITH COLUMN GEOMETRY & BOUNDING BOX MAPPING
# ==============================================================================

FOOTER_STOP_KEYWORDS = [
    "SUB TOTAL", "SUBTOTAL", "TAXABLE VALUE", "TAXABLE AMT", "TAXABLE AMOUNT",
    "TOTAL TAX", "ROUND OFF", "GRAND TOTAL", "NET AMOUNT",
    "INVOICE VALUE", "TOTAL AMOUNT", "BILL AMOUNT", "AMOUNT IN WORDS",
    "BANK DETAILS", "TERMS & CONDITIONS", "AUTHORISED SIGNATORY", "AUTHORIZED SIGNATORY",
    "E. & O.E.", "FOR AYYAPPA"
]

HEADER_KEYWORDS = [
    "DESCRIPTION", "PARTICULARS", "ITEM NAME", "PRODUCT", "ITEM DESCRIPTION", "GOODS", "ITEM",
    "HSN", "SAC", "RSP", "MRP", "RATE", "QTY", "QUANTITY", "INVVAL", "PACQTY", "PACK", "TAXABLE", "TOTAL", "AMOUNT"
]


def parse_spatial_table_rows(
    lines: List[Dict[str, Any]],
    supplier_gstin: Optional[str]
) -> List[ExtractedOcrItem]:
    """
    Extracts tabular line items using PaddleOCR bounding box coordinates (X, Y geometry).
    Handles multi-line item description grouping and calculates each_pack_rate deterministically.
    """
    items: List[ExtractedOcrItem] = []

    # 1. Identify Header & Footer boundaries
    header_idx = -1
    for idx, line in enumerate(lines[:25]):
        upper = line["text"].upper()
        matches = sum(1 for kw in HEADER_KEYWORDS if kw in upper)
        if matches >= 2:
            header_idx = idx
            break

    start_idx = header_idx + 1 if header_idx != -1 else 0
    end_idx = len(lines)

    for idx in range(start_idx, len(lines)):
        upper = lines[idx]["text"].upper()
        # Ensure it's truly a footer line, not an item with the word 'Total' or 'Tax'
        if any(stop_kw in upper for stop_kw in FOOTER_STOP_KEYWORDS):
            # Check if this line looks like a footer total line rather than an item row
            if any(term in upper for term in ["TAXABLE AMOUNT", "TAXABLE VALUE", "SUB TOTAL", "SUBTOTAL", "CGST", "SGST", "IGST", "GRAND TOTAL", "BANK DETAILS", "SIGNATORY"]):
                end_idx = idx
                break

    candidate_lines = lines[start_idx:end_idx]

    # 2. Deconstruct lines into word-level spatial sub-tokens
    structured_rows: List[Dict[str, Any]] = []

    for line in candidate_lines:
        raw_boxes = line.get("boxes", [])
        if not raw_boxes:
            continue

        text = line["text"].strip()
        upper = text.upper()

        if any(skip in upper for skip in ["PAGE ", "SIGNATORY", "PAN:", "GSTIN:", "TAX INVOICE"]):
            continue

        # Expand boxes into individual word tokens with precise X coordinates
        word_tokens: List[Dict[str, Any]] = []
        for b in raw_boxes:
            word_tokens.extend(extract_sub_tokens_from_box(b))

        word_tokens.sort(key=lambda t: t["center_x"])

        # Detect numeric tokens vs text tokens
        num_tokens = []
        text_tokens = []

        for t in word_tokens:
            val = parse_robust_number(t["text"])
            # Treat 6-8 digit purely numeric values as HSN, not general numeric quantity/amount
            if val is not None and not re.match(r"^\d{6,8}$", t["text"].strip()):
                num_tokens.append({**t, "num_val": val})
            else:
                text_tokens.append(t)

        # An item row contains at least 2 numeric values (e.g. qty + total, or rate + qty, etc.)
        is_item_row = len(num_tokens) >= 2

        structured_rows.append({
            "line": line,
            "text": text,
            "word_tokens": word_tokens,
            "num_tokens": num_tokens,
            "text_tokens": text_tokens,
            "is_item_row": is_item_row
        })

    # 3. Multi-line Item Wrapping (Step 4)
    # If a line contains description text but no numeric tokens, group it into adjacent item row
    merged_rows: List[Dict[str, Any]] = []
    pending_lines: List[Dict[str, Any]] = []

    for row in structured_rows:
        if row["is_item_row"]:
            merged_rows.append({
                "lines": pending_lines + [row],
                "conf": row["line"]["conf"]
            })
            pending_lines = []
        else:
            if merged_rows:
                merged_rows[-1]["lines"].append(row)
            else:
                pending_lines.append(row)

    # 4. Parse each merged product row
    for row_dict in merged_rows:
        lines_in_item = row_dict["lines"]

        # Extract description line by line in vertical reading order
        line_descriptions = []
        all_tokens = []

        for line_row in lines_in_item:
            line_tokens = list(line_row["word_tokens"])
            line_tokens.sort(key=lambda t: t["center_x"])
            all_tokens.extend(line_tokens)

            line_desc = []
            for t in line_tokens:
                t_text = t["text"].strip()
                # Skip S.No at the start of a line
                if re.match(r"^\d{1,2}[\.\)]?$", t_text) and not line_desc and not line_descriptions:
                    continue
                # Skip HSN
                if re.match(r"^\d{4,8}$", t_text) and int(t_text) > 1000:
                    continue
                # Skip UOM
                if t_text.upper() in UOM_PATTERNS:
                    continue
                val = parse_robust_number(t_text)
                if val is None or re.search(r"[A-Za-z]", t_text):
                    if not any(hw in t_text.upper() for hw in ["DESCRIPTION", "PARTICULARS", "ITEM", "HSN", "SAC", "RSP", "RATE", "QTY", "INVVAL", "PACQTY"]):
                        line_desc.append(t_text)

            if line_desc:
                line_descriptions.append(" ".join(line_desc))

        clean_item_name = " ".join(line_descriptions).strip()
        clean_item_name = re.sub(r"\s+", " ", clean_item_name)
        if len(clean_item_name) < 2:
            clean_item_name = f"Item {len(items) + 1}"

        # Extract HSN (4 to 8 digit integer token)
        hsn = None
        for t in all_tokens:
            cleaned_hsn = t["text"].strip()
            if re.match(r"^\d{4,8}$", cleaned_hsn) and int(cleaned_hsn) > 1000:
                hsn = cleaned_hsn
                break

        # Extract UOM
        uom = "PAC"
        for t in all_tokens:
            clean_uom = re.sub(r"[^A-Z]", "", t["text"].upper())
            if clean_uom in UOM_PATTERNS:
                uom = clean_uom
                break

        # Extract all numeric values with their spatial center_x
        num_boxes = []
        for t in all_tokens:
            if t["text"].strip() == hsn:
                continue
            val = parse_robust_number(t["text"])
            if val is not None:
                num_boxes.append({
                    "val": val,
                    "center_x": t["center_x"],
                    "text": t["text"]
                })

        num_boxes.sort(key=lambda nb: nb["center_x"])
        num_vals = [nb["val"] for nb in num_boxes]

        # Extract core requested fields:
        # item_name, qty, mrp_rsp, pack_qty, invoice_amount, each_pack_rate
        mrp_rsp = 0.0
        qty = 1.0
        pack_qty = 0.0
        invoice_amount = 0.0
        purchase_rate = 0.0
        taxable_value = 0.0
        gst_rate = 40.0

        # Discriminate column layout
        if len(num_vals) >= 6:
            # Full B2B FMCG invoice table:
            # [MRP/RSP, Rate, Qty, InvVal, PACQty, GST %, (Taxable), Amount]
            invoice_amount = num_vals[-1]

            # MRP/RSP is typically the first number (>= 40.0)
            if num_vals[0] >= 40.0:
                mrp_rsp = num_vals[0]

            # Qty is usually fractional or small integer (0.1 to 50)
            qty_candidates = [v for v in num_vals if 0.05 <= v <= 50.0 and v != mrp_rsp]
            if qty_candidates:
                qty = qty_candidates[0]

            # Pack Qty is integer packs (>= 10, often qty * 100 or qty * 50)
            pack_candidates = [v for v in num_vals if v >= 10 and float(v).is_integer() and v < invoice_amount and v != mrp_rsp]
            if pack_candidates:
                # Find pack count that makes invoice_amount / pack_qty <= mrp_rsp * 1.05
                best_pack = None
                for p in reversed(pack_candidates):
                    if (invoice_amount / p) <= (mrp_rsp * 1.1 if mrp_rsp > 0 else 1000):
                        best_pack = p
                        break
                pack_qty = best_pack if best_pack is not None else pack_candidates[-1]

            # Rate
            purchase_rate = num_vals[1] if len(num_vals) > 1 else (mrp_rsp * 0.9)
            taxable_value = round(invoice_amount / 1.40, 2)

        elif len(num_vals) == 5:
            # E.g. [MRP, Rate, Qty, PackQty, Amount]
            invoice_amount = num_vals[-1]
            if num_vals[0] >= 40.0:
                mrp_rsp = num_vals[0]
            purchase_rate = num_vals[1]
            qty = num_vals[2] if num_vals[2] <= 50.0 else 1.0
            pack_qty = num_vals[3] if num_vals[3] >= 10 else (qty * 100)
            taxable_value = round(invoice_amount / 1.40, 2)

        elif len(num_vals) == 4:
            # E.g. [Qty, Rate, Taxable, Total] or [MRP, Qty, PackQty, Total]
            # Check if num_vals[2] * num_vals[1] is close to total or num_vals[0] * num_vals[1]
            # Standard invoice: [10, 200.00, 2000.00, 2100.00]
            if abs(num_vals[0] * num_vals[1] - num_vals[2]) <= 2.0:
                qty = num_vals[0]
                purchase_rate = num_vals[1]
                taxable_value = num_vals[2]
                invoice_amount = num_vals[3]
                pack_qty = qty
                mrp_rsp = round(purchase_rate * 1.15, 2)
            else:
                # [MRP, Qty, PackQty, Amount]
                mrp_rsp = num_vals[0]
                qty = num_vals[1]
                pack_qty = num_vals[2]
                invoice_amount = num_vals[3]
                taxable_value = round(invoice_amount / 1.40, 2)
                purchase_rate = round(invoice_amount / pack_qty, 2) if pack_qty > 0 else 0.0

        elif len(num_vals) == 3:
            # E.g. [Qty, Rate, Total]
            qty = num_vals[0]
            purchase_rate = num_vals[1]
            invoice_amount = num_vals[2]
            pack_qty = qty
            taxable_value = round(qty * purchase_rate, 2)
            mrp_rsp = round(purchase_rate * 1.15, 2)

        elif len(num_vals) == 2:
            qty = num_vals[0]
            invoice_amount = num_vals[1]
            pack_qty = qty
            purchase_rate = round(invoice_amount / qty, 2) if qty > 0 else invoice_amount
            taxable_value = round(invoice_amount / 1.40, 2)
            mrp_rsp = round(purchase_rate * 1.15, 2)

        elif len(num_vals) == 1:
            invoice_amount = num_vals[0]
            qty = 1.0
            pack_qty = 1.0
            purchase_rate = invoice_amount
            taxable_value = round(invoice_amount / 1.40, 2)
            mrp_rsp = invoice_amount

        # Automatic Pack Multiplier fallback if pack_qty was 0
        if pack_qty == 0 and qty > 0:
            if mrp_rsp > 0 and invoice_amount > 0:
                est_packs = round(invoice_amount / (mrp_rsp * 0.9))
                pack_qty = float(est_packs)
            else:
                pack_qty = float(round(qty * 100))

        # Deterministic Each Pack Rate calculation (Step 7):
        # each_pack_rate = invoice_amount / pack_qty
        each_pack_rate = 0.0
        if pack_qty > 0:
            each_pack_rate = round(invoice_amount / pack_qty, 2)

        # Tax calculations
        is_interstate = False
        if supplier_gstin and len(supplier_gstin) >= 2:
            is_interstate = not supplier_gstin.startswith("33")

        tax_amt = max(0.0, round(invoice_amount - taxable_value, 2))
        cgst = 0.0
        sgst = 0.0
        igst = 0.0
        if is_interstate:
            igst = tax_amt
        else:
            cgst = round(tax_amt / 2.0, 2)
            sgst = round(tax_amt - cgst, 2)

        # Row validation
        warnings: List[str] = []
        if pack_qty <= 0:
            warnings.append("Pack quantity is missing or zero")
        if invoice_amount <= 0:
            warnings.append("Invoice amount is missing or zero")
        if mrp_rsp > 0 and each_pack_rate > mrp_rsp * 1.05:
            warnings.append(f"Each pack rate (₹{each_pack_rate}) exceeds MRP (₹{mrp_rsp})")
        if qty <= 0:
            warnings.append("Billed quantity is missing or zero")

        row_valid = len(warnings) == 0
        needs_review = not row_valid or (row_dict["conf"] < 0.70)

        item = ExtractedOcrItem(
            item_name=clean_item_name,
            supplier_item_name=clean_item_name,
            qty=round(qty, 2),
            quantity=round(qty, 2),
            mrp_rsp=round(mrp_rsp, 2),
            pack_qty=round(pack_qty),
            invoice_amount=round(invoice_amount, 2),
            each_pack_rate=round(each_pack_rate, 2),
            hsn=hsn or "24022090",
            uom=uom,
            purchase_rate=round(purchase_rate, 2),
            gst_rate=round(gst_rate, 2),
            taxable_value=round(taxable_value, 2),
            cgst=round(cgst, 2),
            sgst=round(sgst, 2),
            igst=round(igst, 2),
            discount=None,
            total_tax=round(tax_amt, 2),
            total=round(invoice_amount, 2),
            confidence=round(row_dict["conf"], 2),
            needs_review=needs_review,
            validation=RowValidation(valid=row_valid, warnings=warnings)
        )
        items.append(item)

    return items


# Alias for backwards compatibility
parse_line_items_from_lines = parse_spatial_table_rows


def parse_ocr_results(
    ocr_pages_data: List[List[Tuple[List[List[float]], Tuple[str, float]]]]
) -> ExtractedOcrInvoice:
    """
    Parse raw PaddleOCR bounding boxes and text lines into structured ExtractedOcrInvoice.
    Uses spatial bounding box relationships (X for columns, Y for rows) and deterministic calculations.
    """
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

    # 1. Extract Supplier Name
    supplier_keywords = [
        "ENTERPRISES", "AGENCIES", "TRADERS", "LIMITED", "LTD", "PVT", "CORP",
        "DISTRIBUTORS", "INDUSTRIES", "COMPANY", "CO.", "STORE", "SALES", "MARKETING"
    ]
    skip_headers = [
        "TAX INVOICE", "ORIGINAL", "DUPLICATE", "TRIPLICATE", "BILL OF SUPPLY",
        "RETAIL INVOICE", "CASH MEMO", "INVOICE", "DELIVERY CHALLAN"
    ]

    for line in spatial_lines[:12]:
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

    # 2. Extract GSTIN
    for line in spatial_lines:
        gstin = extract_gstin(line["text"])
        if gstin:
            supplier_gstin = gstin
            supplier_gstin_conf = line["conf"]
            break

    # 3. Extract Invoice Number
    for line in spatial_lines:
        text = line["text"]
        for pat in INVOICE_EXPLICIT_PATTERNS:
            match = pat.search(text)
            if match:
                inv_no = match.group(1).strip()
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

    # 4. Extract Invoice Date
    for line in spatial_lines:
        parsed_d = normalize_date(line["text"])
        if parsed_d:
            invoice_date = parsed_d
            invoice_date_conf = line["conf"]
            break

    # 5. Extract Line Items using Spatial Table Parser
    items = parse_spatial_table_rows(spatial_lines, supplier_gstin)

    # 6. Extract Summary Totals & Taxes from footer
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

        # Handle CGST, SGST, IGST even if on same line
        cgst_match = re.search(r"CGST[^\d]*(\d+(?:\.\d+)?)", upper)
        if cgst_match:
            cgst = parse_float(cgst_match.group(1))

        sgst_match = re.search(r"SGST[^\d]*(\d+(?:\.\d+)?)", upper)
        if sgst_match:
            sgst = parse_float(sgst_match.group(1))

        igst_match = re.search(r"IGST[^\d]*(\d+(?:\.\d+)?)", upper)
        if igst_match:
            igst = parse_float(igst_match.group(1))

        if "ROUND" in upper:
            nums = NUMBER_REGEX.findall(text)
            if nums:
                round_off = parse_float(nums[-1])

    # Reconcile with Line Items
    if items:
        item_taxable_sum = round(sum(it.taxable_value for it in items), 2)
        item_cgst_sum = round(sum(it.cgst for it in items), 2)
        item_sgst_sum = round(sum(it.sgst for it in items), 2)
        item_igst_sum = round(sum(it.igst for it in items), 2)
        item_total_sum = round(sum(it.invoice_amount for it in items), 2)

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

    # Document Level Validation & Confidence
    doc_warnings = []
    is_balanced = abs((subtotal + total_tax + round_off) - grand_total) <= 1.00
    if not is_balanced and grand_total > 0:
        doc_warnings.append(
            f"Double-entry balance check: Subtotal (₹{subtotal}) + Tax (₹{total_tax}) != Grand Total (₹{grand_total})"
        )

    if not items:
        doc_warnings.append("No line items could be extracted from document table")

    any_row_needs_review = any(it.needs_review for it in items)
    doc_valid = len(doc_warnings) == 0 and not any_row_needs_review

    confidences = [b[2] for b in all_boxes]
    raw_avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    balance_factor = 1.0 if is_balanced else 0.85
    overall_confidence = round(min(1.0, raw_avg_conf * balance_factor), 2)

    field_confidence = FieldConfidence(
        supplier_name=round(supplier_name_conf, 2) if supplier_name_conf > 0 else None,
        supplier_gstin=round(supplier_gstin_conf, 2) if supplier_gstin_conf > 0 else None,
        invoice_number=round(invoice_number_conf, 2) if invoice_number_conf > 0 else None,
        invoice_date=round(invoice_date_conf, 2) if invoice_date_conf > 0 else None,
        grand_total=round(grand_total_conf, 2) if grand_total_conf > 0 else None,
    )

    total_packs = sum(it.pack_qty for it in items)

    # Structured Debug Logs (Step 17)
    print(f"=== OCR INVOICE PARSING SUMMARY ===")
    print(f"OCR tokens detected: {len(all_boxes)}")
    print(f"Spatial lines grouped: {len(spatial_lines)}")
    print(f"Line items extracted: {len(items)}")
    print(f"Total packs calculated: {total_packs}")
    print(f"Grand total: ₹{grand_total}")
    print(f"Rows requiring review: {sum(1 for it in items if it.needs_review)}")
    print(f"Document valid: {doc_valid}")
    print(f"===================================")

    return ExtractedOcrInvoice(
        supplier_name=supplier_name,
        supplier_gstin=supplier_gstin,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        payment_mode="CREDIT",
        payment_status="UNPAID",
        items=items,
        total_items=len(items),
        total_packs=round(total_packs),
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
        validation=InvoiceValidation(valid=doc_valid, warnings=doc_warnings),
        needs_review=not doc_valid,
        raw_text=raw_text
    )
