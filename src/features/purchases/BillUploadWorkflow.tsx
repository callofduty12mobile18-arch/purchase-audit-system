import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Camera,
  RotateCw,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  FileText
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ExtractedOcrInvoice, ExtractedOcrItem, PurchaseInvoice } from '../../types';
import { ocrService, createBlankInvoice } from '../../services/ocrService';
import { dbService } from '../../services/dbService';

export const BillUploadWorkflow: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'UPLOAD' | 'PROCESSING' | 'ERROR' | 'VERIFY'>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [progress, setProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<ExtractedOcrInvoice | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingDuplicate, setExistingDuplicate] = useState<PurchaseInvoice | null>(null);
  const [serviceStatus, setServiceStatus] = useState<{ isOnline: boolean; detail?: string } | null>(null);
  const isPdf = selectedFile?.type === 'application/pdf' || selectedFile?.name.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    ocrService.checkServiceHealth().then(setServiceStatus);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // File Handling
  const handleFileSelect = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setOcrError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartOcr = async () => {
    if (!selectedFile) return;
    setStep('PROCESSING');
    setProgress(20);
    setOcrError(null);

    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 300);

    try {
      const extracted = await ocrService.processInvoiceDocument(selectedFile);
      clearInterval(interval);
      setProgress(100);
      setOcrResult(extracted);
      setStep('VERIFY');
    } catch (err: any) {
      clearInterval(interval);
      setOcrError(err?.message || 'Failed to extract text from document. OCR service may not be running.');
      setStep('ERROR');
    }
  };

  const handleEnterManually = () => {
    setOcrResult(createBlankInvoice());
    setStep('VERIFY');
  };

  const recalcFromItems = (items: ExtractedOcrItem[], roundOff = ocrResult?.round_off ?? 0) => {
    const subtotal = items.reduce((sum, i) => sum + (Number(i.taxable_value) || 0), 0);
    const cgstTotal = items.reduce((sum, i) => sum + (Number(i.cgst) || 0), 0);
    const sgstTotal = items.reduce((sum, i) => sum + (Number(i.sgst) || 0), 0);
    const igstTotal = items.reduce((sum, i) => sum + (Number(i.igst) || 0), 0);
    const totalTax = cgstTotal + sgstTotal + igstTotal;
    return {
      items,
      subtotal: Number(subtotal.toFixed(2)),
      taxable_amount: Number(subtotal.toFixed(2)),
      cgst: Number(cgstTotal.toFixed(2)),
      sgst: Number(sgstTotal.toFixed(2)),
      igst: Number(igstTotal.toFixed(2)),
      total_tax: Number(totalTax.toFixed(2)),
      grand_total: Number((subtotal + totalTax + roundOff).toFixed(2)),
    };
  };

  // Helper confidence badge color
  const getConfidenceBadge = (score: number) => {
    if (score >= 0.9) return <Badge variant="success">High Confidence ({(score * 100).toFixed(0)}%)</Badge>;
    if (score >= 0.7) return <Badge variant="info">Medium Confidence ({(score * 100).toFixed(0)}%)</Badge>;
    return <Badge variant="warning">Low Confidence ({(score * 100).toFixed(0)}%)</Badge>;
  };

  // Field change updates
  const handleHeaderChange = (field: keyof ExtractedOcrInvoice, value: string | number) => {
    if (!ocrResult) return;
    const updated: ExtractedOcrInvoice = { ...ocrResult, [field]: value } as ExtractedOcrInvoice;
    // Recalculate totals
    if (['subtotal', 'taxable_amount', 'cgst', 'sgst', 'igst', 'round_off'].includes(field)) {
      if (field === 'taxable_amount') {
        updated.subtotal = Number(value) || 0;
      } else if (field === 'subtotal') {
        updated.taxable_amount = Number(value) || 0;
      }
      const sub = Number(updated.subtotal) || 0;
      const cgst = Number(updated.cgst) || 0;
      const sgst = Number(updated.sgst) || 0;
      const igst = Number(updated.igst) || 0;
      const round = Number(updated.round_off) || 0;
      updated.total_tax = Number((cgst + sgst + igst).toFixed(2));
      updated.grand_total = Number((sub + updated.total_tax + round).toFixed(2));
    }
    setOcrResult(updated);
  };

  const handleItemChange = (index: number, field: keyof ExtractedOcrItem, value: string | number) => {
    if (!ocrResult) return;
    const items = [...ocrResult.items];
    const item = { ...items[index], [field]: value } as ExtractedOcrItem;

    // Auto math calculation on item changes
    if (['quantity', 'purchase_rate', 'gst_rate'].includes(field)) {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.purchase_rate) || 0;
      const gstRate = Number(item.gst_rate) || 0;

      item.taxable_value = Number((qty * rate).toFixed(2));
      item.cgst = Number(((item.taxable_value * (gstRate / 2)) / 100).toFixed(2));
      item.sgst = Number(((item.taxable_value * (gstRate / 2)) / 100).toFixed(2));
      item.igst = 0;
      item.total = Number((item.taxable_value + item.cgst + item.sgst).toFixed(2));
    } else if (field === 'taxable_value') {
      const taxVal = Number(value) || 0;
      const gstRate = Number(item.gst_rate) || 0;
      item.taxable_value = taxVal;
      item.cgst = Number(((taxVal * (gstRate / 2)) / 100).toFixed(2));
      item.sgst = Number(((taxVal * (gstRate / 2)) / 100).toFixed(2));
      item.igst = 0;
      item.total = Number((taxVal + item.cgst + item.sgst).toFixed(2));
    } else if (['cgst', 'sgst', 'igst'].includes(field)) {
      const taxVal = Number(item.taxable_value) || 0;
      const cgst = Number(item.cgst) || 0;
      const sgst = Number(item.sgst) || 0;
      const igst = Number(item.igst) || 0;
      item.total = Number((taxVal + cgst + sgst + igst).toFixed(2));
    }

    items[index] = item;
    setOcrResult({
      ...ocrResult,
      ...recalcFromItems(items, ocrResult.round_off),
    });
  };

  const handleAddItem = () => {
    if (!ocrResult) return;
    const newItem: ExtractedOcrItem = {
      supplier_item_name: 'New Line Item',
      hsn: '',
      quantity: 1,
      uom: 'PCS',
      purchase_rate: 0,
      gst_rate: 18,
      taxable_value: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
      confidence: 1.0
    };
    setOcrResult({
      ...ocrResult,
      items: [...ocrResult.items, newItem]
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!ocrResult || ocrResult.items.length <= 1) return;
    const items = ocrResult.items.filter((_, i) => i !== index);
    setOcrResult({ ...ocrResult, ...recalcFromItems(items, ocrResult.round_off) });
  };

  // Validation Checks
  const calculatedGrandTotal = ocrResult
    ? (ocrResult.subtotal + ocrResult.total_tax + ocrResult.round_off)
    : 0;
  const isTotalMismatch = ocrResult && Math.abs(calculatedGrandTotal - ocrResult.grand_total) > 0.05;

  // Duplicate Inspection & Confirmation
  const handleInitiateConfirm = async () => {
    if (!ocrResult) return;
    setIsSubmitting(true);

    try {
      const suppliers = await dbService.getSuppliers();
      const matchedSupplier = suppliers.find(
        s => s.name.trim().toLowerCase() === ocrResult.supplier_name.trim().toLowerCase()
      );

      if (matchedSupplier) {
        const duplicate = await dbService.checkDuplicateInvoice(matchedSupplier.id, ocrResult.invoice_number);
        if (duplicate) {
          setExistingDuplicate(duplicate);
          setShowDuplicateModal(true);
          setIsSubmitting(false);
          return;
        }
      }

      await executeSaveInvoice();
    } catch (e) {
      console.error('Duplicate verification error:', e);
      alert('Failed to verify duplicate check.');
      setIsSubmitting(false);
    }
  };

  const executeSaveInvoice = async () => {
    if (!ocrResult) return;
    setIsSubmitting(true);
    try {
      const saved = await dbService.confirmAndSaveInvoice(ocrResult, selectedFile?.name);
      navigate(`/purchases/${saved.id}`);
    } catch (e) {
      console.error('Invoice confirmation error:', e);
      alert('Error confirming invoice save.');
    } finally {
      setIsSubmitting(false);
      setShowDuplicateModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Upload File Screen */}
      {step === 'UPLOAD' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <h1 className="page-title justify-center sm:justify-start">
                <Upload className="w-6 h-6 text-[#4B49AC]" />
                Upload & OCR Extract Invoice
              </h1>
              <p className="page-subtitle mx-auto sm:mx-0">
                Upload paper bills, receipts, or PDF invoices. High-accuracy local OCR extracts supplier info, HSN codes, rates & GST taxes.
              </p>
            </div>
            {serviceStatus && (
              <div className="flex items-center justify-center sm:justify-end gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#ECEEF5] shadow-xs shrink-0 self-center sm:self-auto">
                <div className={`w-2.5 h-2.5 rounded-full ${serviceStatus.isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-400 animate-pulse'}`} />
                <span className="text-xs font-semibold text-[#1F1F2C]">
                  {serviceStatus.isOnline ? 'OCR Engine: Online' : 'OCR Engine: Offline'}
                </span>
              </div>
            )}
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="group relative border-2 border-dashed border-[#C8D4FF] hover:border-[#4B49AC] p-8 sm:p-12 bg-white rounded-3xl text-center transition-all duration-300 shadow-skydash hover:shadow-skydash-lg cursor-pointer"
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              id="file-upload-input"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="camera-upload-input"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <label htmlFor="file-upload-input" className="cursor-pointer space-y-4 inline-block">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-[#F5F7FF] text-[#4B49AC] flex items-center justify-center shadow-md shadow-[#4B49AC]/10 group-hover:scale-105 group-hover:bg-[#4B49AC] group-hover:text-white transition-all duration-200">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-[#1F1F2C] tracking-tight">
                  Click to select or drag and drop invoice here
                </p>
                <p className="text-xs text-[#6C7383] mt-1">Supports JPG, PNG, PDF scans up to 15MB</p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="h-px bg-[#ECEEF5] flex-1" />
            <span className="text-xs text-[#8F93A0] uppercase tracking-widest font-bold font-mono px-2">OR DIRECT CAMERA</span>
            <div className="h-px bg-[#ECEEF5] flex-1" />
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold shadow-sm"
              icon={<Camera className="w-5 h-5 text-[#7DA0FA]" />}
              onClick={() => document.getElementById('camera-upload-input')?.click()}
            >
              Scan Document with Mobile Camera
            </Button>
          </div>

          {selectedFile && (
            <div className="p-5 bg-white border border-[#ECEEF5] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-skydash animate-in fade-in">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-3 rounded-xl bg-[#F5F7FF] border border-[#D5DCED] text-[#4B49AC] shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1F1F2C] truncate">{selectedFile.name}</p>
                  <p className="text-xs text-[#6C7383] font-mono mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for OCR</p>
                </div>
              </div>
              <Button
                variant="primary"
                className="w-full sm:w-auto px-6 py-2.5 font-bold shadow-md shadow-[#4B49AC]/25"
                onClick={handleStartOcr}
              >
                Extract Invoice Data
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Processing Indicator */}
      {step === 'PROCESSING' && (
        <div className="max-w-xl mx-auto py-16 text-center space-y-6 bg-white p-8 rounded-3xl border border-[#ECEEF5] shadow-skydash">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-[#7DA0FA]/30 animate-ping" />
            <div className="w-24 h-24 rounded-full border-4 border-[#4B49AC] border-t-transparent animate-spin flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-[#4B49AC]" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#1F1F2C] tracking-tight">Extracting Document Data...</h3>
            <p className="text-xs sm:text-sm text-[#6C7383] mt-1.5">Analyzing vendor GSTIN, invoice number, line item snapshots & GST rates</p>
          </div>
          <div className="w-full bg-[#F5F7FF] rounded-full h-2.5 overflow-hidden border border-[#ECEEF5]">
            <div
              className="bg-[#4B49AC] h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step 2b: OCR Error Screen */}
      {step === 'ERROR' && (
        <div className="max-w-xl mx-auto py-12 px-6 bg-white border border-[#ECEEF5] rounded-3xl text-center space-y-6 shadow-skydash animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#1F1F2C] tracking-tight">OCR Extraction Unavailable</h3>
            <p className="text-xs text-[#6C7383] leading-relaxed max-w-md mx-auto">
              {ocrError || 'Could not connect to the OCR processing engine.'}
            </p>
          </div>
          <div className="p-3.5 bg-[#F5F7FF] border border-[#ECEEF5] rounded-xl text-left">
            <p className="text-xs text-[#6C7383] font-mono">
              <span className="text-[#1F1F2C] font-bold">Options:</span> You can retry the automated OCR or proceed immediately using manual entry.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => setStep('UPLOAD')}
            >
              Choose Another File
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={handleStartOcr}
            >
              Retry OCR
            </Button>
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto font-bold shadow-md shadow-[#4B49AC]/25"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleEnterManually}
            >
              Enter Manually
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Verification Split View Screen */}
      {step === 'VERIFY' && ocrResult && (
        <div className="space-y-4">
          {/* Top Bar Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-[#ECEEF5] rounded-2xl shadow-skydash">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('UPLOAD')} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-[#1F1F2C] tracking-tight">Verify Extracted Invoice</h2>
                  {getConfidenceBadge(ocrResult.overall_confidence)}
                </div>
                <p className="text-xs text-[#6C7383] mt-0.5">Validate extracted rates and quantities against the original document.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setStep('UPLOAD')}>
                Cancel / Re-upload
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto font-bold shadow-md shadow-[#4B49AC]/25"
                onClick={handleInitiateConfirm}
                isLoading={isSubmitting}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm & Save Invoice
              </Button>
            </div>
          </div>

          {isTotalMismatch && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-950">Calculation Mismatch Detected:</strong> Calculated total (₹{calculatedGrandTotal.toFixed(2)}) differs from extracted total (₹{ocrResult.grand_total.toFixed(2)}). Please review individual line items below.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:h-[calc(100vh-220px)] lg:min-h-[620px]">
            {/* LEFT COLUMN: Original Document Viewer */}
            <div className="lg:col-span-5 bg-white border border-[#ECEEF5] rounded-2xl flex flex-col overflow-hidden shadow-skydash min-h-[280px] lg:min-h-0">
              <div className="flex items-center justify-between px-4 py-3 bg-[#F5F7FF] border-b border-[#ECEEF5]">
                <span className="text-xs font-bold text-[#4B49AC] uppercase tracking-wider">Original Bill Scan</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                    className="p-1.5 rounded-lg text-[#6C7383] hover:text-[#4B49AC] hover:bg-white transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-[#6C7383] font-mono px-1.5">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(prev => Math.min(2.5, prev + 0.25))}
                    className="p-1.5 rounded-lg text-[#6C7383] hover:text-[#4B49AC] hover:bg-white transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRotation(prev => (prev + 90) % 360)}
                    className="p-1.5 rounded-lg text-[#6C7383] hover:text-[#4B49AC] hover:bg-white transition-colors ml-1"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#F8F9FE]">
                {previewUrl ? (
                  isPdf ? (
                    <iframe
                      src={previewUrl}
                      title="PDF Invoice Document"
                      className="w-full h-full min-h-[480px] rounded-xl border border-[#ECEEF5] bg-white shadow-md"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Invoice Preview"
                      className="max-w-full transition-transform duration-200 rounded-xl shadow-md border border-[#ECEEF5]"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center'
                      }}
                    />
                  )
                ) : (
                  <div className="text-[#8F93A0] text-xs font-mono">No preview loaded</div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Editable Verification Form */}
            <div className="lg:col-span-7 bg-white border border-[#ECEEF5] rounded-2xl flex flex-col overflow-hidden shadow-skydash min-h-[50vh] lg:min-h-0">
              <div className="p-4 bg-[#F5F7FF] border-b border-[#ECEEF5] flex items-center justify-between">
                <span className="text-xs font-bold text-[#4B49AC] uppercase tracking-wider">Extracted Header & Items Data</span>
                <Badge variant="info">Interactive Editor</Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Header Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Supplier Name"
                    value={ocrResult.supplier_name}
                    onChange={(e) => handleHeaderChange('supplier_name', e.target.value)}
                  />
                  <Input
                    label="Supplier GSTIN"
                    value={ocrResult.supplier_gstin || ''}
                    onChange={(e) => handleHeaderChange('supplier_gstin', e.target.value)}
                  />
                  <Input
                    label="Invoice Number"
                    value={ocrResult.invoice_number}
                    onChange={(e) => handleHeaderChange('invoice_number', e.target.value)}
                  />
                  <Input
                    label="Invoice Date"
                    type="date"
                    value={ocrResult.invoice_date}
                    onChange={(e) => handleHeaderChange('invoice_date', e.target.value)}
                  />
                  <Select
                    label="Payment Mode"
                    value={ocrResult.payment_mode}
                    onChange={(e) => handleHeaderChange('payment_mode', e.target.value as any)}
                    options={[
                      { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
                      { value: 'UPI', label: 'UPI / GPay / PhonePe' },
                      { value: 'CASH', label: 'Cash' },
                      { value: 'CREDIT', label: 'Credit' },
                      { value: 'CHEQUE', label: 'Cheque' },
                    ]}
                  />
                  <Select
                    label="Payment Status"
                    value={ocrResult.payment_status}
                    onChange={(e) => handleHeaderChange('payment_status', e.target.value as any)}
                    options={[
                      { value: 'PAID', label: 'Paid' },
                      { value: 'UNPAID', label: 'Unpaid' },
                    ]}
                  />
                </div>

                {/* Line Items Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F1F2C]">
                      Line Items ({ocrResult.items.length})
                    </h4>
                    <Button variant="outline" size="sm" onClick={handleAddItem} icon={<Plus className="w-3.5 h-3.5" />}>
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {ocrResult.items.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] space-y-3 relative group">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-[#4B49AC] px-2 py-0.5 rounded bg-white border border-[#D5DCED]">#{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            {getConfidenceBadge(item.confidence)}
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-[#8F93A0] hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-5">
                            <Input
                              label="Supplier Item Name (Exact Text)"
                              value={item.supplier_item_name}
                              onChange={(e) => handleItemChange(idx, 'supplier_item_name', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              label="HSN"
                              value={item.hsn || ''}
                              onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              label="Qty"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <Input
                              label="UOM"
                              value={item.uom}
                              onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                          <Input
                            label="Rate (₹)"
                            type="number"
                            step="0.01"
                            value={item.purchase_rate}
                            onChange={(e) => handleItemChange(idx, 'purchase_rate', parseFloat(e.target.value) || 0)}
                          />
                          <Input
                            label="GST %"
                            type="number"
                            value={item.gst_rate}
                            onChange={(e) => handleItemChange(idx, 'gst_rate', parseFloat(e.target.value) || 0)}
                          />
                          <Input
                            label="Taxable (₹)"
                            type="number"
                            readOnly
                            className="bg-[#F8F9FE] text-[#6C7383]"
                            value={item.taxable_value}
                          />
                          <Input
                            label="Total (₹)"
                            type="number"
                            readOnly
                            className="bg-[#F8F9FE] text-[#4B49AC] font-bold"
                            value={item.total}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals Breakdown */}
                <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] space-y-2.5 text-xs">
                  <div className="flex justify-between text-[#6C7383]">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono text-[#1F1F2C] font-semibold">₹{ocrResult.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#6C7383]">
                    <span>CGST + SGST Tax:</span>
                    <span className="font-mono text-[#1F1F2C] font-semibold">₹{ocrResult.total_tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#6C7383] items-center">
                    <span>Round Off:</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 text-right bg-white border border-[#D5DCED] rounded-lg px-2.5 py-1.5 text-[#1F1F2C] font-mono focus:border-[#4B49AC] focus:ring-1 focus:ring-[#4B49AC]"
                      value={ocrResult.round_off}
                      onChange={(e) => handleHeaderChange('round_off', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#1F1F2C] pt-2.5 border-t border-[#ECEEF5]">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[#4B49AC] text-base font-bold">₹{ocrResult.grand_total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Invoice Warning Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Possible Duplicate Invoice Detected"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDuplicateModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={executeSaveInvoice} isLoading={isSubmitting}>
              Continue & Save Anyway
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold text-rose-950">Duplicate Match Found:</p>
              <p className="mt-0.5">
                An invoice from <strong>{ocrResult?.supplier_name}</strong> with invoice number <strong>{ocrResult?.invoice_number}</strong> already exists in the database.
              </p>
            </div>
          </div>
          {existingDuplicate && (
            <div className="p-3.5 bg-[#F5F7FF] border border-[#ECEEF5] rounded-xl text-xs space-y-1">
              <p><strong className="text-[#6C7383]">Existing Invoice Date:</strong> {existingDuplicate.invoice_date}</p>
              <p><strong className="text-[#6C7383]">Grand Total:</strong> ₹{existingDuplicate.grand_total.toFixed(2)}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
