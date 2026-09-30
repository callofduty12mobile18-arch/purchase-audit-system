import { ExtractedOcrInvoice } from '../types';

export const createBlankInvoice = (): ExtractedOcrInvoice => ({
  supplier_name: '',
  supplier_gstin: '',
  invoice_number: '',
  invoice_date: new Date().toISOString().slice(0, 10),
  payment_mode: 'CREDIT',
  payment_status: 'UNPAID',
  subtotal: 0,
  taxable_amount: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  total_tax: 0,
  round_off: 0,
  grand_total: 0,
  overall_confidence: 0,
  items: [
    {
      supplier_item_name: '',
      hsn: '',
      quantity: 1,
      uom: 'PAC',
      purchase_rate: 0,
      gst_rate: 40,
      taxable_value: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
      confidence: 0,
    },
  ],
});

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data url prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const ocrService = {
  checkServiceHealth: async (): Promise<{ isOnline: boolean; detail?: string }> => {
    const ocrUrl = import.meta.env.VITE_OCR_SERVICE_URL;
    if (!ocrUrl) {
      return { isOnline: false, detail: 'VITE_OCR_SERVICE_URL is not defined in environment.' };
    }
    try {
      const response = await fetch(`${ocrUrl}/health`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        return { isOnline: data.status === 'healthy', detail: `Model loaded: ${data.model_loaded ? 'Yes' : 'No'}` };
      }
      return { isOnline: false, detail: `Health check returned status ${response.status}` };
    } catch (e: any) {
      return { isOnline: false, detail: e?.message || 'Failed to connect to local OCR microservice.' };
    }
  },

  processInvoiceDocument: async (file: File): Promise<ExtractedOcrInvoice> => {
    const ocrUrl = import.meta.env.VITE_OCR_SERVICE_URL;

    if (!ocrUrl) {
      throw new Error('OCR service URL is not configured. Please start the Python OCR service and configure VITE_OCR_SERVICE_URL, or enter invoice data manually.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${ocrUrl}/ocr/invoice`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.detail || `OCR processing failed with status ${response.status}`);
    }

    const result = await response.json();
    if (!result || !result.items || !Array.isArray(result.items)) {
      throw new Error('Invalid response structure received from OCR service');
    }

    return result as ExtractedOcrInvoice;
  }
};

