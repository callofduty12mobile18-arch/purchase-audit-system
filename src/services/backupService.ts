/**
 * Backup and Data Export Service
 * ---------------------------------------------------------------------------
 * Provides full JSON system backups, CSV spreadsheet exports for invoices,
 * product catalog, and suppliers, as well as restore capabilities.
 */

import { dbService } from './dbService';
import { supabase } from '../integrations/supabase/client';
import { PurchaseInvoice, Product, Supplier, AuditLog, InvoicePayment } from '../types';
import { formatINR, getTodayIST } from '../utils/dateUtils';

export interface FullBackupPayload {
  backup_version: string;
  exported_at: string;
  exported_by: string;
  stats: {
    total_invoices: number;
    total_products: number;
    total_suppliers: number;
    total_payments: number;
    total_audit_logs: number;
  };
  data: {
    invoices: PurchaseInvoice[];
    products: Product[];
    suppliers: Supplier[];
    payments: InvoicePayment[];
    audit_logs: AuditLog[];
  };
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/\r\n/g, ' ').replace(/\n/g, ' ');
  if (str.includes(',') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const backupService = {
  /**
   * Assemble complete system backup directly from database
   */
  createFullBackup: async (userEmail: string = 'polonium84r@gmail.com'): Promise<FullBackupPayload> => {
    const [invoices, products, suppliers, auditLogs] = await Promise.all([
      dbService.getInvoices(),
      dbService.getProducts(),
      dbService.getSuppliers(),
      dbService.getAuditLogs(),
    ]);

    let payments: InvoicePayment[] = [];
    try {
      const { data, error } = await supabase.from('invoice_payments').select('*').order('payment_date', { ascending: true });
      if (!error && data) {
        payments = data as InvoicePayment[];
      }
    } catch (e) {
      console.warn('Backup payments fetch note:', e);
    }

    return {
      backup_version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: userEmail,
      stats: {
        total_invoices: invoices.length,
        total_products: products.length,
        total_suppliers: suppliers.length,
        total_payments: payments.length,
        total_audit_logs: auditLogs.length,
      },
      data: {
        invoices,
        products,
        suppliers,
        payments,
        audit_logs: auditLogs,
      },
    };
  },

  /**
   * Export and trigger download of full JSON backup file
   */
  downloadFullBackupJson: async (userEmail: string = 'polonium84r@gmail.com'): Promise<FullBackupPayload> => {
    const backup = await backupService.createFullBackup(userEmail);
    const dateStr = getTodayIST().replace(/-/g, '');
    const jsonString = JSON.stringify(backup, null, 2);
    triggerDownload(jsonString, `purchase_audit_backup_${dateStr}.json`, 'application/json;charset=utf-8;');
    return backup;
  },

  /**
   * Export Invoices to CSV
   */
  exportInvoicesCsv: async (): Promise<number> => {
    const invoices = await dbService.getInvoices();
    const headers = [
      'Invoice #',
      'Memo Name',
      'Invoice Date',
      'Supplier',
      'Supplier GSTIN',
      'Payment Mode',
      'Payment Status',
      'Total Items',
      'Subtotal (INR)',
      'Tax (INR)',
      'Grand Total (INR)',
      'Created At',
    ];

    const rows = invoices.map((inv) => [
      escapeCsv(inv.invoice_number),
      escapeCsv(inv.invoice_name || 'RAMACHANDRAN'),
      escapeCsv(inv.invoice_date),
      escapeCsv(inv.supplier?.name || ''),
      escapeCsv(inv.supplier?.gstin || ''),
      escapeCsv(inv.payment_mode),
      escapeCsv(inv.payment_status),
      inv.items?.length || 0,
      inv.subtotal.toFixed(2),
      inv.total_tax.toFixed(2),
      inv.grand_total.toFixed(2),
      escapeCsv(inv.created_at || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const dateStr = getTodayIST().replace(/-/g, '');
    triggerDownload(csvContent, `invoices_export_${dateStr}.csv`, 'text/csv;charset=utf-8;');
    return invoices.length;
  },

  /**
   * Export Products Catalog to CSV
   */
  exportProductsCsv: async (): Promise<number> => {
    const products = await dbService.getProducts();
    const headers = [
      'Supplier Item Name',
      'Nickname',
      'HSN',
      'UOM',
      'Purchase Reference Rate (INR)',
      'Selling Price (INR)',
      'Min Stock Level',
      'Status',
    ];

    const rows = products.map((prod) => [
      escapeCsv(prod.supplier_item_name),
      escapeCsv(prod.nickname || ''),
      escapeCsv(prod.hsn || '24022090'),
      escapeCsv(prod.uom || 'PAC'),
      prod.current_purchase_ref_price.toFixed(2),
      prod.current_selling_price.toFixed(2),
      prod.min_stock_level,
      prod.is_active ? 'Active' : 'Inactive',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const dateStr = getTodayIST().replace(/-/g, '');
    triggerDownload(csvContent, `products_catalog_${dateStr}.csv`, 'text/csv;charset=utf-8;');
    return products.length;
  },

  /**
   * Export Suppliers to CSV
   */
  exportSuppliersCsv: async (): Promise<number> => {
    const suppliers = await dbService.getSuppliers();
    const headers = [
      'Supplier Name',
      'GSTIN',
      'Phone',
      'Address',
      'Payment Terms',
      'Status',
    ];

    const rows = suppliers.map((sup) => [
      escapeCsv(sup.name),
      escapeCsv(sup.gstin || ''),
      escapeCsv(sup.phone || ''),
      escapeCsv(sup.address || ''),
      escapeCsv(sup.payment_terms || 'CREDIT'),
      sup.is_active ? 'Active' : 'Inactive',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const dateStr = getTodayIST().replace(/-/g, '');
    triggerDownload(csvContent, `suppliers_export_${dateStr}.csv`, 'text/csv;charset=utf-8;');
    return suppliers.length;
  },

  /**
   * Restore system data from a JSON backup payload
   */
  restoreBackup: async (payload: FullBackupPayload): Promise<{
    invoicesRestored: number;
    productsRestored: number;
    suppliersRestored: number;
  }> => {
    if (!payload?.data) {
      throw new Error('Invalid backup file format. Expected root "data" object.');
    }

    const { invoices, products, suppliers, payments, audit_logs } = payload.data;

    // Restore directly to Supabase remote DB
    try {
      if (Array.isArray(suppliers) && suppliers.length > 0) {
        await supabase.from('suppliers').upsert(
          suppliers.map((s) => ({
            id: s.id,
            name: s.name,
            gstin: s.gstin || '',
            address: s.address || '',
            phone: s.phone || '',
            payment_terms: s.payment_terms || 'CREDIT',
            is_active: s.is_active ?? true,
          }))
        );
      }

      if (Array.isArray(products) && products.length > 0) {
        await supabase.from('products').upsert(
          products.map((p) => ({
            id: p.id,
            supplier_item_name: p.supplier_item_name,
            nickname: p.nickname,
            hsn: p.hsn,
            uom: p.uom,
            current_purchase_ref_price: p.current_purchase_ref_price,
            current_selling_price: p.current_selling_price,
            min_stock_level: p.min_stock_level,
            is_active: p.is_active ?? true,
          }))
        );
      }

      if (Array.isArray(invoices) && invoices.length > 0) {
        for (const inv of invoices) {
          await supabase.from('purchase_invoices').upsert({
            id: inv.id,
            supplier_id: inv.supplier_id,
            invoice_number: inv.invoice_number,
            invoice_name: inv.invoice_name || '',
            invoice_date: inv.invoice_date,
            payment_mode: inv.payment_mode,
            payment_status: inv.payment_status,
            cheque_status: inv.cheque_status,
            cheque_amount: inv.cheque_amount,
            cheque_presentation_date: inv.cheque_presentation_date,
            bank_name: inv.bank_name,
            subtotal: inv.subtotal,
            taxable_amount: inv.taxable_amount,
            cgst: inv.cgst,
            sgst: inv.sgst,
            igst: inv.igst,
            total_tax: inv.total_tax,
            round_off: inv.round_off,
            grand_total: inv.grand_total,
            verification_status: inv.verification_status,
            ocr_status: inv.ocr_status,
          });

          if (inv.items && inv.items.length > 0) {
            await supabase.from('purchase_items').upsert(
              inv.items.map((it) => ({
                id: it.id,
                purchase_invoice_id: inv.id,
                product_id: it.product_id,
                supplier_item_name_snapshot: it.supplier_item_name_snapshot,
                hsn_snapshot: it.hsn_snapshot,
                quantity: it.quantity,
                uom_snapshot: it.uom_snapshot,
                purchase_rate: it.purchase_rate,
                gst_rate: it.gst_rate,
                taxable_value: it.taxable_value,
                cgst: it.cgst,
                sgst: it.sgst,
                igst: it.igst,
                total: it.total,
              }))
            );
          }
        }
      }

      if (Array.isArray(payments) && payments.length > 0) {
        await supabase.from('invoice_payments').upsert(
          payments.map((p) => ({
            id: p.id,
            invoice_id: p.invoice_id,
            payment_method: p.payment_method,
            amount: p.amount,
            payment_date: p.payment_date,
            payment_status: p.payment_status,
            cheque_number: p.cheque_number,
            bank_name: p.bank_name,
            cheque_date: p.cheque_date,
            clearance_date: p.clearance_date,
            notes: p.notes,
          }))
        );
      }
    } catch (e) {
      console.warn('Supabase remote restore note:', e);
    }

    // Log the restore event to audit log
    await dbService.logAudit(
      'DATABASE_CLEARED' as any,
      'settings',
      'system_restore',
      null,
      {
        invoices: invoices?.length || 0,
        products: products?.length || 0,
        suppliers: suppliers?.length || 0,
      },
      `Restored backup created at ${payload.exported_at} by ${payload.exported_by}`
    );

    return {
      invoicesRestored: invoices?.length || 0,
      productsRestored: products?.length || 0,
      suppliersRestored: suppliers?.length || 0,
    };
  },
};

