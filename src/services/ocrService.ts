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
      item_name: '',
      supplier_item_name: '',
      hsn: '',
      qty: 1,
      quantity: 1,
      uom: 'PAC',
      mrp_rsp: 0,
      pack_qty: 100,
      invoice_amount: 0,
      each_pack_rate: 0,
      purchase_rate: 0,
      gst_rate: 40,
      taxable_value: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
      confidence: 1.0,
      needs_review: false,
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

const getOcrBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_OCR_SERVICE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'https://invoice-ocr-service-9szm.onrender.com';
};

export const ocrService = {
  checkServiceHealth: async (): Promise<{ isOnline: boolean; detail?: string }> => {
    const baseUrl = getOcrBaseUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { isOnline: data.status === 'healthy', detail: `Model loaded: ${data.model_loaded ? 'Yes' : 'No'}` };
      }
      return { isOnline: false, detail: `Health check returned status ${response.status}` };
    } catch (e: any) {
      return { isOnline: false, detail: e?.message || 'Connecting to OCR microservice...' };
    }
  },

  processInvoiceDocument: async (file: File): Promise<ExtractedOcrInvoice> => {
    const baseUrl = getOcrBaseUrl();
    const formData = new FormData();
    formData.append('file', file);

    let lastError: any = null;

    // Retry up to 2 times to handle Render cold-start wakeups
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        // Allow up to 45 seconds for cold-start PaddleOCR response
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(`${baseUrl}/ocr/invoice`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.detail || `OCR processing failed with status ${response.status}`);
        }

        const result = await response.json();
        if (!result || !result.items || !Array.isArray(result.items)) {
          throw new Error('Invalid response structure received from OCR service');
        }

        return result as ExtractedOcrInvoice;
      } catch (err: any) {
        lastError = err;
        console.warn(`OCR attempt ${attempt} failed:`, err?.message);
        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 2000));
        }
      }
    }

    throw new Error(
      lastError?.name === 'AbortError'
        ? 'OCR service is taking longer than usual to start up. Please tap Retry OCR in a moment.'
        : lastError?.message || 'Could not connect to OCR service. Please check your network or try again.'
    );
  }
};


