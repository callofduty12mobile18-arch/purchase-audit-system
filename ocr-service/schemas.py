from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator


class RowValidation(BaseModel):
    valid: bool = Field(True, description="True if line item passes mathematical and consistency checks")
    warnings: List[str] = Field(default_factory=list, description="List of warnings or validation failures")


class InvoiceValidation(BaseModel):
    valid: bool = Field(True, description="True if overall invoice passes double-entry reconciliations")
    warnings: List[str] = Field(default_factory=list, description="Invoice-level validation warnings")


class ExtractedOcrItem(BaseModel):
    # Core requested fields
    item_name: str = Field(..., description="Clean, human-readable product description")
    supplier_item_name: str = Field("", description="Exact raw item text from the invoice")
    qty: float = Field(1.0, description="Billed quantity (e.g. cases/cartons)")
    mrp_rsp: float = Field(0.0, description="Maximum Retail Price / Retail Selling Price per pack")
    pack_qty: float = Field(0.0, description="Total units / packs billed")
    invoice_amount: float = Field(0.0, description="Total invoice amount for line item including taxes")
    each_pack_rate: float = Field(0.0, description="Calculated landed rate per pack = invoice_amount / pack_qty")

    # Backwards compatibility & tax breakdown fields
    hsn: Optional[str] = Field(None, description="HSN or SAC code")
    quantity: float = Field(1.0, description="Alias for qty")
    uom: str = Field("PAC", description="Unit of measurement (PAC, PCS, BOX, etc.)")
    purchase_rate: float = Field(0.0, description="Base rate per unit before tax")
    invoice_value: Optional[float] = Field(None, description="Assessable / invoice value before tax")
    net_invoice_value: Optional[float] = Field(None, description="Net invoice value after line discounts")
    gst_rate: float = Field(0.0, description="GST rate percentage (e.g. 18, 28, 40)")
    taxable_value: float = Field(0.0, description="Taxable amount for line item")
    cgst: float = Field(0.0, description="Central GST amount")
    sgst: float = Field(0.0, description="State GST amount")
    igst: float = Field(0.0, description="Integrated GST amount")
    discount: Optional[float] = Field(None, description="Discount amount if present")
    total_tax: float = Field(0.0, description="Total tax for line item")
    total: float = Field(0.0, description="Line total including taxes (alias for invoice_amount)")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="OCR confidence score for item")
    needs_review: bool = Field(False, description="Flag indicating row requires manual verification")
    validation: RowValidation = Field(default_factory=RowValidation, description="Row-level validation checks")

    @model_validator(mode="before")
    @classmethod
    def sync_aliases_and_calculate_pack_rate(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Sync item_name and supplier_item_name
            if not data.get("item_name") and data.get("supplier_item_name"):
                data["item_name"] = data["supplier_item_name"]
            elif not data.get("supplier_item_name") and data.get("item_name"):
                data["supplier_item_name"] = data["item_name"]

            # Sync qty and quantity
            if "qty" in data and "quantity" not in data:
                data["quantity"] = data["qty"]
            elif "quantity" in data and "qty" not in data:
                data["qty"] = data["quantity"]

            # Sync total and invoice_amount
            if "invoice_amount" in data and ("total" not in data or data["total"] == 0.0):
                data["total"] = data["invoice_amount"]
            elif "total" in data and ("invoice_amount" not in data or data["invoice_amount"] == 0.0):
                data["invoice_amount"] = data["total"]

            # Deterministic each_pack_rate calculation: invoice_amount / pack_qty
            pack_qty = float(data.get("pack_qty") or 0.0)
            inv_amt = float(data.get("invoice_amount") or data.get("total") or 0.0)
            if pack_qty > 0 and inv_amt > 0:
                data["each_pack_rate"] = round(inv_amt / pack_qty, 2)
            elif "each_pack_rate" not in data:
                data["each_pack_rate"] = 0.0

        return data


class FieldConfidence(BaseModel):
    supplier_name: Optional[float] = Field(None, ge=0.0, le=1.0)
    supplier_gstin: Optional[float] = Field(None, ge=0.0, le=1.0)
    invoice_number: Optional[float] = Field(None, ge=0.0, le=1.0)
    invoice_date: Optional[float] = Field(None, ge=0.0, le=1.0)
    grand_total: Optional[float] = Field(None, ge=0.0, le=1.0)


class ExtractedOcrInvoice(BaseModel):
    supplier_name: str = Field("", description="Supplier / Vendor business name")
    supplier_gstin: Optional[str] = Field(None, description="15-character Supplier GSTIN")
    invoice_number: str = Field("", description="Invoice or Bill number")
    invoice_date: str = Field("", description="Invoice date in YYYY-MM-DD format")
    payment_mode: str = Field("CREDIT", description="Payment mode")
    payment_status: str = Field("UNPAID", description="Payment status")
    items: List[ExtractedOcrItem] = Field(default_factory=list, description="Extracted line items")
    total_items: int = Field(0, description="Total number of line items")
    total_packs: float = Field(0.0, description="Total number of packs in invoice")
    subtotal: float = Field(0.0, description="Taxable subtotal")
    taxable_amount: float = Field(0.0, description="Total taxable amount")
    cgst: float = Field(0.0, description="CGST total")
    sgst: float = Field(0.0, description="SGST total")
    igst: float = Field(0.0, description="IGST total")
    total_tax: float = Field(0.0, description="Total tax amount")
    round_off: float = Field(0.0, description="Round off adjustment")
    grand_total: float = Field(0.0, description="Grand invoice total")
    overall_confidence: float = Field(0.0, ge=0.0, le=1.0, description="Overall document confidence")
    field_confidence: Optional[FieldConfidence] = Field(None, description="Per-field confidence scores")
    validation: InvoiceValidation = Field(default_factory=InvoiceValidation, description="Document validation")
    needs_review: bool = Field(False, description="Flag indicating if any row or total needs review")
    raw_text: Optional[str] = Field(None, description="Concatenated raw OCR text")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    ocr_lang: str
    supported_formats: List[str]
    max_file_size_mb: int
