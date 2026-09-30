import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local if available
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
} catch {
  // Ignore fallback
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log(`--- SUPABASE DB STATUS VERIFICATION (${supabaseUrl}) ---`);

  const tables = [
    'suppliers',
    'categories',
    'products',
    'purchase_invoices',
    'purchase_invoice_documents',
    'purchase_items',
    'price_history',
    'stock_transactions',
    'audit_logs'
  ];

  for (const table of tables) {
    const { data, count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`- ${table}: Error (${error.message})`);
    } else {
      console.log(`- ${table}: ${count ?? 0} rows`);
    }
  }

  console.log('----------------------------------------------------');
}

verify();
