-- ==============================================================================
-- PURCHASE AUDIT & ORDER PLANNER — COMPLETE DATABASE SCHEMA & 17 ITEMS SEED
-- Paste and RUN this entire script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enumeration Types
DO $$ BEGIN
    CREATE TYPE payment_mode_enum AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT', 'CHEQUE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE verification_status_enum AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ocr_status_enum AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE price_type_enum AS ENUM ('PURCHASE_REF', 'SELLING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE stock_transaction_type_enum AS ENUM ('PURCHASE', 'ADJUSTMENT', 'RETURN', 'DISCARD');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ==============================================================================
-- 3. CREATE TABLES
-- ==============================================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'USER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    gstin TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    payment_terms TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_item_name TEXT NOT NULL,
    nickname TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    hsn TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    uom TEXT NOT NULL DEFAULT 'PCS',
    current_purchase_ref_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_purchase_ref_price >= 0),
    current_selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_selling_price >= 0),
    min_stock_level NUMERIC(12, 3) NOT NULL DEFAULT 0.00 CHECK (min_stock_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PURCHASE INVOICES
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    payment_mode payment_mode_enum NOT NULL DEFAULT 'BANK_TRANSFER',
    payment_status payment_status_enum NOT NULL DEFAULT 'PAID',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    source_document_id UUID,
    verification_status verification_status_enum NOT NULL DEFAULT 'PENDING_VERIFICATION',
    ocr_status ocr_status_enum NOT NULL DEFAULT 'PENDING',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_supplier_invoice UNIQUE (supplier_id, invoice_number)
);

-- PURCHASE INVOICE DOCUMENTS
CREATE TABLE IF NOT EXISTS purchase_invoice_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    supplier_item_name_snapshot TEXT NOT NULL,
    hsn_snapshot TEXT,
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    uom_snapshot TEXT NOT NULL DEFAULT 'PCS',
    purchase_rate NUMERIC(12, 2) NOT NULL CHECK (purchase_rate >= 0),
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (gst_rate >= 0),
    taxable_value NUMERIC(12, 2) NOT NULL CHECK (taxable_value >= 0),
    cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    line_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRICE HISTORY
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_type price_type_enum NOT NULL,
    old_value NUMERIC(12, 2) NOT NULL,
    new_value NUMERIC(12, 2) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT NOT NULL
);

-- STOCK TRANSACTIONS
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    transaction_type stock_transaction_type_enum NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    reference_id UUID,
    reference_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on profiles" ON profiles;
    CREATE POLICY "Allow full access on profiles" ON profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on suppliers" ON suppliers;
    CREATE POLICY "Allow full access on suppliers" ON suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on categories" ON categories;
    CREATE POLICY "Allow full access on categories" ON categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on products" ON products;
    CREATE POLICY "Allow full access on products" ON products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on purchase_invoices" ON purchase_invoices;
    CREATE POLICY "Allow full access on purchase_invoices" ON purchase_invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on purchase_invoice_documents" ON purchase_invoice_documents;
    CREATE POLICY "Allow full access on purchase_invoice_documents" ON purchase_invoice_documents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on purchase_items" ON purchase_items;
    CREATE POLICY "Allow full access on purchase_items" ON purchase_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on price_history" ON price_history;
    CREATE POLICY "Allow full access on price_history" ON price_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on stock_transactions" ON stock_transactions;
    CREATE POLICY "Allow full access on stock_transactions" ON stock_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow full access on audit_logs" ON audit_logs;
    CREATE POLICY "Allow full access on audit_logs" ON audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;


-- ==============================================================================
-- 5. SEED SUPPLIER (AYYAPPA ENTERPRISES)
-- ==============================================================================
INSERT INTO suppliers (id, name, gstin, address, phone, payment_terms, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'AYYAPPA ENTERPRISES',
    '33AABFA2949R1Z5',
    'NO 308A CTH ROAD, THIRUNINDRAVUR, Tamil Nadu',
    '9841055999',
    'CREDIT',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    gstin = EXCLUDED.gstin,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone;


-- ==============================================================================
-- 6. SEED 17 CATALOG PRODUCTS
-- ==============================================================================
INSERT INTO products (id, supplier_item_name, nickname, uom, hsn, current_purchase_ref_price, current_selling_price, is_active)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'CI Ice Burst 10M 10BE', 'Ice Burst 10M', 'PAC', '24022090', 215.78, 240.00, true),
    ('b0000000-0000-0000-0000-000000000002', 'CI Ice Burst 20BE', 'Ice Burst 20BE', 'PAC', '24022090', 431.56, 480.00, true),
    ('b0000000-0000-0000-0000-000000000003', 'NC DLX FT 10BE (MD+NPCT)-FF', 'Navy Cut DLX FT 10', 'PAC', '24022090', 114.09, 125.00, true),
    ('b0000000-0000-0000-0000-000000000004', 'GFK RED NBUNDLE+NPCT1 10R', 'Gold Flake Red 10R', 'PAC', '24022090', 220.24, 240.00, true),
    ('b0000000-0000-0000-0000-000000000005', 'GFK RED NBUNDLE+NPCT 120R', 'Gold Flake Red 20R', 'PAC', '24022090', 430.56, 480.00, true),
    ('b0000000-0000-0000-0000-000000000006', 'GFK BLUE NBUNDLE+NPCT 10R', 'Gold Flake Blue 10R', 'PAC', '24022090', 220.24, 240.00, true),
    ('b0000000-0000-0000-0000-000000000007', 'GOLD FL FT-10BE MD+NPCT-FF', 'Gold Flake Lights 10s', 'PAC', '24022090', 116.57, 127.00, true),
    ('b0000000-0000-0000-0000-000000000008', 'SCISSORS FT 10BE-NB-MD1-NP', 'Scissors Filter 10s', 'PAC', '24022090', 99.70, 109.00, true),
    ('b0000000-0000-0000-0000-000000000009', 'FLAKE GOLD CREST 10HL 70', 'Flake Gold Crest 70', 'PAC', '24022090', 63.99, 70.00, true),
    ('b0000000-0000-0000-0000-000000000010', 'GFT MINI 10BE 70', 'Gold Flake Mini 70', 'PAC', '24022090', 81.35, 89.00, true),
    ('b0000000-0000-0000-0000-000000000011', 'Indie Mint 10BE 115', 'Indie Mint 10s', 'PAC', '24022090', 114.09, 125.00, true),
    ('b0000000-0000-0000-0000-000000000012', 'WAVE COOL MINT 10R C 96', 'Wave Cool Mint 10R', 'PAC', '24022090', 87.00, 96.00, true),
    ('b0000000-0000-0000-0000-000000000013', 'CI Double Burst FS-BDG-ND 20BE', 'Capstan Double Burst 20', 'PAC', '24022090', 431.56, 480.00, true),
    ('b0000000-0000-0000-0000-000000000014', 'AM CLUBNY COOL SLEEKSFTK', 'American Club Cool Sleeks', 'PAC', '24022090', 321.43, 360.00, true),
    ('b0000000-0000-0000-0000-000000000015', 'WAVE COOL MINT DLX FT 10BE', 'Wave Cool Mint DLX 10', 'PAC', '24022090', 53.00, 60.00, true),
    ('b0000000-0000-0000-0000-000000000016', 'WAVEBOSS REFINED TASTE DS', 'Waveboss Refined Taste', 'PAC', '24022090', 53.00, 60.00, true),
    ('b0000000-0000-0000-0000-000000000017', 'GFK MIXPOD MD+NPCT FT 10BE', 'Gold Flake Mixpod 10s', 'PAC', '24022090', 220.24, 240.00, true)
ON CONFLICT (id) DO UPDATE SET
    supplier_item_name = EXCLUDED.supplier_item_name,
    nickname = EXCLUDED.nickname,
    current_purchase_ref_price = EXCLUDED.current_purchase_ref_price,
    current_selling_price = EXCLUDED.current_selling_price,
    hsn = EXCLUDED.hsn;


-- ==============================================================================
-- 7. SEED VERIFIED PURCHASE INVOICE (CI26-27/006288)
-- ==============================================================================
INSERT INTO purchase_invoices (
    id,
    supplier_id,
    invoice_number,
    invoice_date,
    subtotal,
    taxable_amount,
    cgst,
    sgst,
    igst,
    total_tax,
    round_off,
    grand_total,
    payment_mode,
    payment_status,
    verification_status,
    ocr_status
)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'CI26-27/006288',
    '2026-09-29',
    227904.37,
    227904.37,
    45580.87,
    45580.87,
    0.00,
    91161.75,
    0.00,
    319066.12,
    'CREDIT',
    'UNPAID',
    'VERIFIED',
    'COMPLETED'
)
ON CONFLICT (id) DO UPDATE SET
    grand_total = EXCLUDED.grand_total,
    subtotal = EXCLUDED.subtotal,
    total_tax = EXCLUDED.total_tax;


-- ==============================================================================
-- 8. SEED 17 INVOICE LINE ITEMS
-- ==============================================================================
DELETE FROM purchase_items WHERE purchase_invoice_id = 'c0000000-0000-0000-0000-000000000001';

INSERT INTO purchase_items (
    purchase_invoice_id,
    product_id,
    supplier_item_name_snapshot,
    hsn_snapshot,
    quantity,
    uom_snapshot,
    purchase_rate,
    gst_rate,
    taxable_value,
    cgst,
    sgst,
    igst,
    total,
    line_number
)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'CI Ice Burst 10M 10BE', '24022090', 20, 'PAC', 215.78, 40, 3082.54, 616.51, 616.51, 0, 4315.56, 1),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'CI Ice Burst 20BE', '24022090', 10, 'PAC', 431.56, 40, 3082.54, 616.51, 616.51, 0, 4315.56, 2),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'NC DLX FT 10BE (MD+NPCT)-FF', '24022090', 50, 'PAC', 114.09, 40, 4074.54, 814.91, 814.91, 0, 5704.36, 3),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'GFK RED NBUNDLE+NPCT1 10R', '24022090', 100, 'PAC', 220.24, 40, 15731.29, 3146.26, 3146.26, 0, 22023.81, 4),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'GFK RED NBUNDLE+NPCT 120R', '24022090', 50, 'PAC', 430.56, 40, 15377.21, 3075.44, 3075.44, 0, 21528.10, 5),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'GFK BLUE NBUNDLE+NPCT 10R', '24022090', 160, 'PAC', 220.24, 40, 25170.07, 5034.01, 5034.01, 0, 35238.10, 6),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 'GOLD FL FT-10BE MD+NPCT-FF', '24022090', 600, 'PAC', 116.57, 40, 49957.51, 9991.50, 9991.50, 0, 69940.51, 7),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008', 'SCISSORS FT 10BE-NB-MD1-NP', '24022090', 250, 'PAC', 99.70, 40, 17803.99, 3560.80, 3560.80, 0, 24925.59, 8),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000009', 'FLAKE GOLD CREST 10HL 70', '24022090', 500, 'PAC', 63.99, 40, 22852.89, 4570.58, 4570.58, 0, 31994.05, 9),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'GFT MINI 10BE 70', '24022090', 400, 'PAC', 81.35, 40, 23242.62, 4648.52, 4648.52, 0, 32539.67, 10),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'Indie Mint 10BE 115', '24022090', 220, 'PAC', 114.09, 40, 17928.00, 3585.60, 3585.60, 0, 25099.20, 11),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000012', 'WAVE COOL MINT 10R C 96', '24022090', 100, 'PAC', 87.00, 40, 6214.16, 1242.83, 1242.83, 0, 8699.82, 12),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000013', 'CI Double Burst FS-BDG-ND 20BE', '24022090', 10, 'PAC', 431.56, 40, 3082.55, 616.51, 616.51, 0, 4315.57, 13),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000014', 'AM CLUBNY COOL SLEEKSFTK', '24022090', 50, 'PAC', 321.43, 40, 11479.64, 2295.93, 2295.93, 0, 16071.49, 14),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000015', 'WAVE COOL MINT DLX FT 10BE', '24022090', 100, 'PAC', 53.00, 40, 3785.70, 757.14, 757.14, 0, 5299.98, 15),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000016', 'WAVEBOSS REFINED TASTE DS', '24022090', 50, 'PAC', 53.00, 40, 1892.85, 378.57, 378.57, 0, 2649.99, 16),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000017', 'GFK MIXPOD MD+NPCT FT 10BE', '24022090', 20, 'PAC', 220.24, 40, 3146.26, 629.25, 629.25, 0, 4404.76, 17);


-- ==============================================================================
-- 9. RECORD AUDIT LOG
-- ==============================================================================
INSERT INTO audit_logs (action, entity_type, entity_id, reason, new_value)
VALUES (
    'INVOICE_CONFIRMED',
    'PURCHASE_INVOICE',
    'c0000000-0000-0000-0000-000000000001',
    'Imported 17 products and verified invoice totaling ₹319,066.12 with 2,640 packs',
    '{"invoice_number": "CI26-27/006288", "total_items": 17, "total_packs": 2640, "grand_total": 319066.12}'::jsonb
);
