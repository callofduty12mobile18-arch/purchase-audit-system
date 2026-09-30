from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ExtractedOcrItem(BaseModel):
    supplier_item_name: str = Field(..., description="Item description from bill")
    hsn: Optional[str] = Field(None, description="HSN or SAC code")
    quantity: float = Field(1.0, description="Quantity / Pack quantity")
    uom: str = Field("PCS", description="Unit of measurement (PAC, PCS, BOX, etc.)")
    purchase_rate: float = Field(0.0, description="Base rate per unit before tax")
    gst_rate: float = Field(0.0, description="Total GST rate percentage (e.g. 18, 40)")
    taxable_value: float = Field(0.0, description="Taxable amount for line item")
    cgst: float = Field(0.0, description="Central GST amount")
    sgst: float = Field(0.0, description="State GST amount")
    igst: float = Field(0.0, description="Integrated GST amount")
    discount: Optional[float] = Field(None, description="Discount amount if present")
    total: float = Field(0.0, description="Line total including taxes")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="OCR confidence score for item")


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
    raw_text: Optional[str] = Field(None, description="Concatenated raw OCR text")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    ocr_lang: str
    supported_formats: List[str]
    max_file_size_mb: int
