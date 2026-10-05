import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

try {
  const envPath = path.resolve('.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = trimmed.split('=')[1].trim();
      } else if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseAnonKey = trimmed.split('=')[1].trim();
      }
    }
  }
} catch (e) {
  console.error(e);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase environment variables missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const INVOICE_DATA = {
  total_items: 17,
  total_packs: 2640,
  total_invoice_value: 319066.12,
  items: [
    {
      item: "CI Ice Burst 10M 10BE",
      nickname: "Ice Burst 10M",
      qty: 0.2,
      packs: 20,
      mrp_rsp: 240.00,
      invoice_amount: 4315.56,
      each_pack_rate: 215.78,
      hsn: "24022090"
    },
    {
      item: "CI Ice Burst 20BE",
      nickname: "Ice Burst 20BE",
      qty: 0.2,
      packs: 10,
      mrp_rsp: 480.00,
      invoice_amount: 4315.56,
      each_pack_rate: 431.56,
      hsn: "24022090"
    },
    {
      item: "NC DLX FT 10BE (MD+NPCT)-FF",
      nickname: "Navy Cut DLX FT 10",
      qty: 0.5,
      packs: 50,
      mrp_rsp: 125.00,
      invoice_amount: 5704.36,
      each_pack_rate: 114.09,
      hsn: "24022090"
    },
    {
      item: "GFK RED NBUNDLE+NPCT1 10R",
      nickname: "Gold Flake Red 10R",
      qty: 1.0,
      packs: 100,
      mrp_rsp: 240.00,
      invoice_amount: 22023.81,
      each_pack_rate: 220.24,
      hsn: "24022090"
    },
    {
      item: "GFK RED NBUNDLE+NPCT 120R",
      nickname: "Gold Flake Red 20R",
      qty: 1.0,
      packs: 50,
      mrp_rsp: 480.00,
      invoice_amount: 21528.10,
      each_pack_rate: 430.56,
      hsn: "24022090"
    },
    {
      item: "GFK BLUE NBUNDLE+NPCT 10R",
      nickname: "Gold Flake Blue 10R",
      qty: 1.6,
      packs: 160,
      mrp_rsp: 240.00,
      invoice_amount: 35238.10,
      each_pack_rate: 220.24,
      hsn: "24022090"
    },
    {
      item: "GOLD FL FT-10BE MD+NPCT-FF",
      nickname: "Gold Flake Lights 10s",
      qty: 6.0,
      packs: 600,
      mrp_rsp: 127.00,
      invoice_amount: 69940.51,
      each_pack_rate: 116.57,
      hsn: "24022090"
    },
    {
      item: "SCISSORS FT 10BE-NB-MD1-NP",
      nickname: "Scissors Filter 10s",
      qty: 2.5,
      packs: 250,
      mrp_rsp: 109.00,
      invoice_amount: 24925.59,
      each_pack_rate: 99.70,
      hsn: "24022090"
    },
    {
      item: "FLAKE GOLD CREST 10HL 70",
      nickname: "Flake Gold Crest 70",
      qty: 5.0,
      packs: 500,
      mrp_rsp: 70.00,
      invoice_amount: 31994.05,
      each_pack_rate: 63.99,
      hsn: "24022090"
    },
    {
      item: "GFT MINI 10BE 70",
      nickname: "Gold Flake Mini 70",
      qty: 4.0,
      packs: 400,
      mrp_rsp: 89.00,
      invoice_amount: 32539.67,
      each_pack_rate: 81.35,
      hsn: "24022090"
    },
    {
      item: "Indie Mint 10BE 115",
      nickname: "Indie Mint 10s",
      qty: 2.2,
      packs: 220,
      mrp_rsp: 125.00,
      invoice_amount: 25099.20,
      each_pack_rate: 114.09,
      hsn: "24022090"
    },
    {
      item: "WAVE COOL MINT 10R C 96",
      nickname: "Wave Cool Mint 10R",
      qty: 1.0,
      packs: 100,
      mrp_rsp: 96.00,
      invoice_amount: 8699.82,
      each_pack_rate: 87.00,
      hsn: "24022090"
    },
    {
      item: "CI Double Burst FS-BDG-ND 20BE",
      nickname: "Capstan Double Burst 20",
      qty: 0.2,
      packs: 10,
      mrp_rsp: 480.00,
      invoice_amount: 4315.57,
      each_pack_rate: 431.56,
      hsn: "24022090"
    },
    {
      item: "AM CLUBNY COOL SLEEKSFTK",
      nickname: "American Club Cool Sleeks",
      qty: 1.0,
      packs: 50,
      mrp_rsp: 360.00,
      invoice_amount: 16071.49,
      each_pack_rate: 321.43,
      hsn: "24022090"
    },
    {
      item: "WAVE COOL MINT DLX FT 10BE",
      nickname: "Wave Cool Mint DLX 10",
      qty: 1.0,
      packs: 100,
      mrp_rsp: 60.00,
      invoice_amount: 5299.98,
      each_pack_rate: 53.00,
      hsn: "24022090"
    },
    {
      item: "WAVEBOSS REFINED TASTE DS",
      nickname: "Waveboss Refined Taste",
      qty: 0.5,
      packs: 50,
      mrp_rsp: 60.00,
      invoice_amount: 2649.99,
      each_pack_rate: 53.00,
      hsn: "24022090"
    },
    {
      item: "GFK MIXPOD MD+NPCT FT 10BE",
      nickname: "Gold Flake Mixpod 10s",
      qty: 0.2,
      packs: 20,
      mrp_rsp: 240.00,
      invoice_amount: 4404.76,
      each_pack_rate: 220.24,
      hsn: "24022090"
    }
  ]
};

async function seed() {
  console.log('🚀 Starting import of 17 items into Supabase...');

  // Authenticate as admin user
  const email = 'admin@audit.com';
  const password = 'Password@123456';

  let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authErr) {
    console.log('User not found, signing up admin account in Supabase...');
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password
    });
    if (signUpErr) {
      console.warn('Sign up note:', signUpErr.message);
    }
  }

  // 1. Get or Create Supplier (Ayyappa Enterprises)
  let { data: suppliers, error: supErr } = await supabase
    .from('suppliers')
    .select('*')
    .ilike('name', '%Ayyappa%');

  let supplierId = suppliers?.[0]?.id;

  if (!supplierId) {
    console.log('Adding supplier: AYYAPPA ENTERPRISES');
    const { data: newSup, error: insSupErr } = await supabase
      .from('suppliers')
      .insert({
        name: 'AYYAPPA ENTERPRISES',
        gstin: '33AABFA2949R1Z5',
        address: 'NO 308A CTH ROAD, THIRUNINDRAVUR, Tamil Nadu',
        phone: '9841055999',
        payment_terms: 'CREDIT',
        is_active: true
      })
      .select()
      .single();

    if (insSupErr) {
      console.error('Failed to create supplier:', insSupErr);
      process.exit(1);
    }
    supplierId = newSup.id;
  }
  console.log(`✓ Supplier ready: ${supplierId}`);

  // 2. Insert or Update Products
  const createdProducts = [];
  for (const item of INVOICE_DATA.items) {
    // Check if product exists
    const { data: existingProd } = await supabase
      .from('products')
      .select('*')
      .eq('supplier_item_name', item.item)
      .maybeSingle();

    if (existingProd) {
      // Update prices
      const { data: updProd } = await supabase
        .from('products')
        .update({
          nickname: item.nickname,
          current_purchase_ref_price: item.each_pack_rate,
          current_selling_price: item.mrp_rsp,
          hsn: item.hsn,
          uom: 'PAC',
          is_active: true
        })
        .eq('id', existingProd.id)
        .select()
        .single();
      createdProducts.push(updProd);
      console.log(`Updated product: ${item.nickname} (₹${item.each_pack_rate}/pack)`);
    } else {
      const { data: newProd, error: prodErr } = await supabase
        .from('products')
        .insert({
          supplier_item_name: item.item,
          nickname: item.nickname,
          hsn: item.hsn,
          uom: 'PAC',
          current_purchase_ref_price: item.each_pack_rate,
          current_selling_price: item.mrp_rsp,
          is_active: true
        })
        .select()
        .single();

      if (prodErr) {
        console.error(`Error inserting product ${item.item}:`, prodErr);
      } else {
        createdProducts.push(newProd);
        console.log(`Created product: ${item.nickname} (₹${item.each_pack_rate}/pack)`);
      }
    }
  }

  // 3. Create Invoice Record
  const invoiceNumber = 'CI26-27/006288';
  const invoiceDate = '2026-09-29';

  // Calculate tax breakdown (40% GST = 20% CGST + 20% SGST)
  const taxableSubtotal = Number((INVOICE_DATA.total_invoice_value / 1.40).toFixed(2));
  const totalTax = Number((INVOICE_DATA.total_invoice_value - taxableSubtotal).toFixed(2));
  const halfTax = Number((totalTax / 2).toFixed(2));

  // Check if invoice exists
  const { data: existingInv } = await supabase
    .from('purchase_invoices')
    .select('id')
    .eq('supplier_id', supplierId)
    .eq('invoice_number', invoiceNumber)
    .maybeSingle();

  let invoiceId = existingInv?.id;

  if (!invoiceId) {
    const { data: newInv, error: invErr } = await supabase
      .from('purchase_invoices')
      .insert({
        supplier_id: supplierId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        subtotal: taxableSubtotal,
        taxable_amount: taxableSubtotal,
        cgst: halfTax,
        sgst: halfTax,
        igst: 0,
        total_tax: totalTax,
        round_off: 0,
        grand_total: INVOICE_DATA.total_invoice_value,
        payment_mode: 'CREDIT',
        payment_status: 'UNPAID',
        verification_status: 'VERIFIED',
        ocr_status: 'COMPLETED'
      })
      .select()
      .single();

    if (invErr) {
      console.error('Failed to create invoice:', invErr);
      process.exit(1);
    }
    invoiceId = newInv.id;
    console.log(`✓ Created Invoice #${invoiceNumber} (ID: ${invoiceId})`);
  }

  // 4. Insert Purchase Items
  for (let idx = 0; idx < INVOICE_DATA.items.length; idx++) {
    const item = INVOICE_DATA.items[idx];
    const prod = createdProducts.find(p => p && p.supplier_item_name === item.item);
    const itemTotal = item.invoice_amount;
    const itemTaxable = Number((itemTotal / 1.40).toFixed(2));
    const itemTax = Number((itemTotal - itemTaxable).toFixed(2));
    const itemCgst = Number((itemTax / 2).toFixed(2));
    const itemSgst = Number((itemTax - itemCgst).toFixed(2));

    await supabase
      .from('purchase_items')
      .insert({
        invoice_id: invoiceId,
        product_id: prod?.id || null,
        supplier_item_name_snapshot: item.item,
        hsn_snapshot: item.hsn,
        quantity: item.packs,
        uom_snapshot: 'PAC',
        purchase_rate: item.each_pack_rate,
        gst_rate: 40,
        taxable_value: itemTaxable,
        cgst: itemCgst,
        sgst: itemSgst,
        igst: 0,
        total: itemTotal,
        line_number: idx + 1
      });
  }
  console.log(`✓ Inserted all ${INVOICE_DATA.items.length} line items into invoice.`);

  // 5. Audit Log
  await supabase
    .from('audit_logs')
    .insert({
      action: 'INVOICE_CONFIRMED',
      entity_type: 'PURCHASE_INVOICE',
      entity_id: invoiceId,
      reason: 'Batch import of 17-item invoice totaling ₹319,066.12 with 2640 packs',
      new_value: { invoice_number: invoiceNumber, total_packs: INVOICE_DATA.total_packs, total_amount: INVOICE_DATA.total_invoice_value }
    });

  console.log('🎉 17 items & invoice successfully saved to Supabase!');
}

seed();
