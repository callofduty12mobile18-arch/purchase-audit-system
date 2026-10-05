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

const NEW_PRODUCTS = [
  {
    supplier_item_name: 'GOLD FL FT-10BE MD+NPCT-FF',
    nickname: 'Gold Flake Lights 10s',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 116.57,
    current_selling_price: 127.00,
    min_stock_level: 5,
    is_active: true
  },
  {
    supplier_item_name: 'GOLD FLAKE FX SPECIAL 2-POD',
    nickname: 'Gold Flake FX Special 2-Pod',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 337.30,
    current_selling_price: 390.00,
    min_stock_level: 5,
    is_active: true
  },
  {
    supplier_item_name: 'CI CONNECT FT 20R C 390/-',
    nickname: 'Capstan Connect FT 20R',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 392.86,
    current_selling_price: 390.00,
    min_stock_level: 5,
    is_active: true
  },
  {
    supplier_item_name: 'WAVE COOL MINT DLX FT 10BE',
    nickname: 'Wave Cool Mint DLX 10',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 53.00,
    current_selling_price: 60.00,
    min_stock_level: 5,
    is_active: true
  }
];

async function addProducts() {
  console.log('Authenticating with Supabase...');
  const email = 'admin@audit.com';
  const password = 'Password@123456';

  let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authErr) {
    console.log('Signing up admin account in Supabase...');
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password
    });
    if (signUpErr) {
      console.warn('Sign up note:', signUpErr.message);
    } else {
      console.log('✓ Signed up admin account');
    }
  } else {
    console.log('✓ Signed in as:', authData.user.email);
  }

  console.log('Fetching existing products from Supabase...');
  const { data: existing, error: fetchErr } = await supabase.from('products').select('*');
  if (fetchErr) {
    console.error('Error fetching products:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${existing ? existing.length : 0} existing products in DB.`);

  for (const item of NEW_PRODUCTS) {
    const matched = existing?.find(
      p => p.supplier_item_name.trim().toLowerCase() === item.supplier_item_name.trim().toLowerCase() ||
           p.nickname.trim().toLowerCase() === item.nickname.trim().toLowerCase()
    );

    const now = new Date().toISOString();
    const productPayload = {
      id: matched ? matched.id : `b0000000-0000-0000-0000-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      supplier_item_name: item.supplier_item_name,
      nickname: matched?.nickname || item.nickname,
      hsn: item.hsn,
      uom: item.uom,
      current_purchase_ref_price: item.current_purchase_ref_price,
      current_selling_price: item.current_selling_price,
      min_stock_level: item.min_stock_level,
      is_active: true,
      created_at: matched?.created_at || now,
      updated_at: now
    };

    console.log(`Upserting: ${item.supplier_item_name} (${item.nickname}) -> Purchase Ref: ₹${item.current_purchase_ref_price}, MRP: ₹${item.current_selling_price}`);
    const { data: saved, error: upsertErr } = await supabase
      .from('products')
      .upsert(productPayload)
      .select()
      .single();

    if (upsertErr) {
      console.error(`Failed to upsert ${item.supplier_item_name}:`, upsertErr);
    } else {
      console.log(`✓ Saved ${saved.nickname} (ID: ${saved.id})`);

      // Log price history if changed
      if (matched && matched.current_purchase_ref_price !== item.current_purchase_ref_price) {
        await supabase.from('price_history').insert({
          id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          product_id: saved.id,
          price_type: 'PURCHASE_RATE',
          old_value: matched.current_purchase_ref_price,
          new_value: item.current_purchase_ref_price,
          reason: 'Updated from latest purchase bill rates',
          changed_at: now
        });
      }
    }
  }

  const { data: allProds } = await supabase.from('products').select('*');
  console.log(`\nAll products in DB now: ${allProds?.length || 0}`);
  allProds?.forEach((p, i) => {
    console.log(`${i + 1}. ${p.nickname} ("${p.supplier_item_name}") - Ref: ₹${p.current_purchase_ref_price} | MRP: ₹${p.current_selling_price}`);
  });
}

addProducts().catch(console.error);
