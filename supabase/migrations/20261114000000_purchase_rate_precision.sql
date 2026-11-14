-- Migration: Support full decimal precision for purchase rates
-- Created: 2026-11-14

ALTER TABLE IF EXISTS public.purchase_items 
    ALTER COLUMN purchase_rate TYPE NUMERIC(16, 6);

ALTER TABLE IF EXISTS public.products 
    ALTER COLUMN current_purchase_ref_price TYPE NUMERIC(16, 6);

ALTER TABLE IF EXISTS public.price_history 
    ALTER COLUMN old_value TYPE NUMERIC(16, 6),
    ALTER COLUMN new_value TYPE NUMERIC(16, 6);

ALTER TABLE IF EXISTS public.sales 
    ALTER COLUMN purchase_price TYPE NUMERIC(16, 6);

