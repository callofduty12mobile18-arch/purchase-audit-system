// Core Data Types for Purchase Audit & Order Planning System

export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CREDIT' | 'CHEQUE' | 'OTHER';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type VerificationStatus = 'DRAFT' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'MANUAL';
export type PriceType = 'PURCHASE_REF' | 'SELLING';
export type StockTransactionType = 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DISCARD';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'ADMIN' | 'USER';
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Product {
  id: string;
  supplier_item_name: string;
  nickname: string;
  sku?: string;
  barcode?: string;
  hsn?: string;
  category_id?: string;
  category?: Category;
  uom: string;
  current_purchase_ref_price: number;
  current_selling_price: number;
  min_stock_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoiceDocument {
  id: string;
  purchase_invoice_id?: string;
  storage_path: string;
  file_type: string;
  page_number: number;
  uploaded_at: string;
  preview_url?: string;
}

export interface PurchaseItem {
  id: string;
  purchase_invoice_id: string;
  product_id?: string;
  product?: Product;
  supplier_item_name_snapshot: string;
  hsn_snapshot?: string;
  quantity: number;
  uom_snapshot: string;
  purchase_rate: number;
  gst_rate: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  created_at: string;
}

export interface PurchaseInvoice {
  id: string;
  supplier_id: string;
  supplier?: Supplier;
  invoice_number: string;
  invoice_date: string;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  subtotal: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  round_off: number;
  grand_total: number;
  source_document_id?: string;
  source_document?: PurchaseInvoiceDocument;
  documents?: PurchaseInvoiceDocument[];
  verification_status: VerificationStatus;
  ocr_status: OcrStatus;
  items?: PurchaseItem[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  product?: Product;
  price_type: PriceType;
  old_value: number;
  new_value: number;
  effective_from: string;
  changed_by?: string;
  reason: string;
  changed_at: string;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  product?: Product;
  transaction_type: StockTransactionType;
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  reason?: string;
  timestamp: string;
}

export interface RowValidation {
  valid: boolean;
  warnings: string[];
}

export interface InvoiceValidation {
  valid: boolean;
  warnings: string[];
}

// Extracted OCR Data Interface
export interface ExtractedOcrItem {
  item_name?: string;
  supplier_item_name: string;
  qty?: number;
  quantity: number;
  mrp_rsp?: number;
  pack_qty?: number;
  invoice_amount?: number;
  each_pack_rate?: number;
  hsn?: string;
  uom: string;
  purchase_rate: number;
  invoice_value?: number;
  net_invoice_value?: number;
  gst_rate: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  discount?: number;
  total_tax?: number;
  total: number;
  confidence: number; // 0.0 to 1.0
  needs_review?: boolean;
  validation?: RowValidation;
}

export interface ExtractedOcrInvoice {
  supplier_name: string;
  supplier_gstin?: string;
  invoice_number: string;
  invoice_date: string;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  items: ExtractedOcrItem[];
  total_items?: number;
  total_packs?: number;
  subtotal: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  round_off: number;
  grand_total: number;
  overall_confidence: number;
  field_confidence?: {
    supplier_name?: number;
    supplier_gstin?: number;
    invoice_number?: number;
    invoice_date?: number;
    grand_total?: number;
    [key: string]: number | undefined;
  };
  validation?: InvoiceValidation;
  needs_review?: boolean;
  raw_text?: string;
}
