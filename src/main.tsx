import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Purge any legacy frontend localStorage caches so database is always source of truth
try {
  [
    'ramachandran_products_v1',
    'ramachandran_suppliers_v1',
    'ramachandran_invoices_v1',
    'ramachandran_audit_v1',
    'ramachandran_price_history_v1',
    'ramachandran_invoice_payments_v1',
    'ramachandran_payments_offline_queue_v1',
  ].forEach((key) => localStorage.removeItem(key));
} catch {
  // Ignore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
