import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate, formatINR, getTodayIST } from './dateUtils';

export interface OrderPdfLine {
  nickname: string;
  supplierItemName: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface OrderPdfPayload {
  buyerName?: string;
  supplierName: string;
  supplierGstin?: string;
  lines: OrderPdfLine[];
  totalPacks: number;
  skuCount: number;
  taxable: number;
  gst: number;
  grandTotal: number;
}

const BUYER_DEFAULT = 'RAMACHANDRAN';
const NAVY: [number, number, number] = [23, 37, 84];
const SLATE: [number, number, number] = [51, 65, 85];
const MUTED: [number, number, number] = [100, 116, 139];

function rupee(n: number): string {
  return `Rs ${formatINR(n)}`;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'Agency';
}

export function generateOrderPdf(payload: OrderPdfPayload): void {
  const buyer = payload.buyerName?.trim() || BUYER_DEFAULT;
  const dateLabel = formatDisplayDate(new Date());
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(buyer, margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Purchase order estimate', margin, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(dateLabel, pageW - margin, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // Meta block
  let y = 36;
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ORDER TO', margin, y);
  doc.text('GSTIN', margin + 92, y);
  doc.text('SKUS / PACKS', pageW - margin, y, { align: 'right' });

  y += 5;
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const supplierLines = doc.splitTextToSize(payload.supplierName || 'Distributor', 86);
  const gstinLines = doc.splitTextToSize(payload.supplierGstin || '—', 48);
  doc.text(supplierLines, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(gstinLines, margin + 92, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(`${payload.skuCount} / ${payload.totalPacks}`, pageW - margin, y, { align: 'right' });

  y += Math.max(8, supplierLines.length * 5, gstinLines.length * 4.2) + 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 28 },
    head: [['#', 'Product', 'Packs', 'Rate (Rs)', 'Amount (Rs)']],
    body: payload.lines.map((line, idx) => [
      String(idx + 1),
      `${line.nickname}\n${line.supplierItemName}`,
      String(line.quantity),
      rupee(line.rate),
      rupee(line.total),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 },
      textColor: SLATE,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: MUTED },
      1: { cellWidth: 92, halign: 'left', textColor: NAVY },
      2: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: NAVY },
    },
  });

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  let totalsY = tableEnd + 8;
  const boxW = 78;
  const boxX = pageW - margin - boxW;
  const boxH = 20;

  if (totalsY + boxH + 16 > pageH - 18) {
    doc.addPage();
    totalsY = 20;
  }

  // Totals box — grand total only
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(boxX, totalsY, boxW, boxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('Grand total', boxX + 4, totalsY + 13);
  doc.text(rupee(payload.grandTotal), boxX + boxW - 4, totalsY + 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `${payload.skuCount} SKUs  ·  ${payload.totalPacks} packs`,
    margin,
    totalsY + 12
  );

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 12, pageW, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${buyer}  ·  Order estimate`, margin, pageH - 5);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 5, { align: 'right' });
  }

  const filename = `Order_Estimate_${safeFilename(payload.supplierName)}_${getTodayIST()}.pdf`;
  doc.save(filename);
}
