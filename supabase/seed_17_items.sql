-- ==============================================================================
-- 1. UPDATE RLS POLICIES (Allow anon + authenticated for internal single-tenant store)
-- ==============================================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated full access on suppliers" ON suppliers;
    DROP POLICY IF EXISTS "Allow full access on suppliers" ON suppliers;
    CREATE POLICY "Allow full access on suppliers" ON suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated full access on products" ON products;
    DROP POLICY IF EXISTS "Allow full access on products" ON products;
    CREATE POLICY "Allow full access on products" ON products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated full access on purchase_invoices" ON purchase_invoices;
    DROP POLICY IF EXISTS "Allow full access on purchase_invoices" ON purchase_invoices;
    CREATE POLICY "Allow full access on purchase_invoices" ON purchase_invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated full access on purchase_items" ON purchase_items;
    DROP POLICY IF EXISTS "Allow full access on purchase_items" ON purchase_items;
    CREATE POLICY "Allow full access on purchase_items" ON purchase_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated access on price_history" ON price_history;
    DROP POLICY IF EXISTS "Allow full access on price_history" ON price_history;
    CREATE POLICY "Allow full access on price_history" ON price_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read and insert on audit_logs" ON audit_logs;
    DROP POLICY IF EXISTS "Allow authenticated insert on audit_logs" ON audit_logs;
    DROP POLICY IF EXISTS "Allow full access on audit_logs" ON audit_logs;
    CREATE POLICY "Allow full access on audit_logs" ON audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_object THEN null; END $$;


-- ==============================================================================
-- 2. INSERT SUPPLIER (AYYAPPA ENTERPRISES)
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
-- 3. INSERT 17 CATALOG PRODUCTS
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
-- 4. INSERT VERIFIED PURCHASE INVOICE
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
-- 5. INSERT 17 LINE ITEMS
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
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'NC DLX FT 10BE (MD+NPCT)-FF', '24022090', 50, 'PAC', 114.09, 40, 4074.54, 814.91, 814.91, 0, 5704.36, 3),
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
-- 6. RECORD AUDIT LOG
-- ==============================================================================
INSERT INTO audit_logs (action, entity_type, entity_id, reason, new_value)
VALUES (
    'INVOICE_CONFIRMED',
    'PURCHASE_INVOICE',
    'c0000000-0000-0000-0000-000000000001',
    'Imported 17 products and verified invoice totaling ₹319,066.12 with 2,640 packs',
    '{"invoice_number": "CI26-27/006288", "total_items": 17, "total_packs": 2640, "grand_total": 319066.12}'::jsonb
);
