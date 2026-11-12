import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SaleTransaction } from '../types';
import { formatDisplayDate, formatINR, getTodayIST } from './dateUtils';

export interface RevenuePdfPayload {
  businessName?: string;
  periodLabel: string;
  totalPurchased: number;
  totalSold: number;
  grossProfit: number;
  profitMargin: number;
  items: SaleTransaction[];
}

const BUSINESS_DEFAULT = 'RAMACHANDRAN';
const NAVY: [number, number, number] = [15, 23, 42]; // Slate 900
const BRAND_BLUE: [number, number, number] = [37, 99, 235]; // Blue 600
const TEXT_SLATE: [number, number, number] = [51, 65, 85]; // Slate 700
const TEXT_MUTED: [number, number, number] = [100, 116, 139]; // Slate 500
const PROFIT_GREEN: [number, number, number] = [5, 150, 105]; // Emerald 600
const LOSS_RED: [number, number, number] = [225, 29, 72]; // Rose 600
const BORDER_COLOR: [number, number, number] = [226, 232, 240]; // Slate 200

function rupee(n: number): string {
  return `Rs ${formatINR(n)}`;
}

export function generateRevenuePdf(payload: RevenuePdfPayload): void {
  const business = payload.businessName?.trim() || BUSINESS_DEFAULT;
  const todayStr = getTodayIST();
  const dateLabel = formatDisplayDate(new Date());

  // A4 Landscape: 297mm width x 210mm height
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  // ---------------------------------------------------------------------------
  // 1. TOP HEADER BANNER (Compact & Clean: 22mm)
  // ---------------------------------------------------------------------------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 22, 'F');

  // Business Name & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(business, margin, 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('REVENUE & PROFIT ANALYTICS REPORT', margin, 16.5);

  // Period Badge & Date on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Period: ${payload.periodLabel}`, pageW - margin, 9.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${dateLabel} (IST)`, pageW - margin, 16.5, { align: 'right' });

  // ---------------------------------------------------------------------------
  // 2. EXECUTIVE SUMMARY CARDS (3 CARDS: 18mm height)
  // ---------------------------------------------------------------------------
  const cardY = 26;
  const cardH = 17;
  const totalCardsW = pageW - margin * 2;
  const cardGap = 5;
  const cardW = (totalCardsW - cardGap * 2) / 3;

  // Card 1: Total Purchased
  const c1X = margin;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(c1X, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('TOTAL PURCHASED', c1X + 4.5, cardY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...TEXT_SLATE);
  doc.text(rupee(payload.totalPurchased), c1X + 4.5, cardY + 13);

  // Card 2: Total Sold
  const c2X = c1X + cardW + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c2X, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('TOTAL SOLD (REVENUE)', c2X + 4.5, cardY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...BRAND_BLUE);
  doc.text(rupee(payload.totalSold), c2X + 4.5, cardY + 13);

  // Card 3: My Profit
  const c3X = c2X + cardW + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c3X, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('MY PROFIT', c3X + 4.5, cardY + 5.5);

  const isProfitable = payload.grossProfit >= 0;
  const profitColor = isProfitable ? PROFIT_GREEN : LOSS_RED;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...profitColor);
  const profitSign = isProfitable ? '+ ' : '- ';
  const profitText = `${profitSign}${rupee(Math.abs(payload.grossProfit))} (${payload.profitMargin.toFixed(1)}%)`;
  doc.text(profitText, c3X + 4.5, cardY + 13);

  // ---------------------------------------------------------------------------
  // 3. PRODUCT-WISE BREAKDOWN TABLE
  // ---------------------------------------------------------------------------
  const tableStartY = cardY + cardH + 5;

  // Compute Totals
  const totalQuantity = payload.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const totalPurchaseSum = payload.items.reduce((s, it) => s + (Number(it.total_cogs) || 0), 0);
  const totalRevenueSum = payload.items.reduce((s, it) => s + (Number(it.total_revenue) || 0), 0);
  const totalProfitSum = payload.items.reduce((s, it) => s + (Number(it.gross_profit) || 0), 0);
  const overallMargin = totalRevenueSum > 0 ? (totalProfitSum / totalRevenueSum) * 100 : 0;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin, bottom: 12 },
    showHead: 'everyPage',
    showFoot: 'lastPage', // CRITICAL: Only print TOTALS row ONCE on the last page!
    rowPageBreak: 'avoid', // CRITICAL: Never split a row or multi-line product cell across pages!
    head: [[
      '#',
      'Product Name (A-Z)',
      'Total Quantity',
      'Unit Cost',
      'Selling Price',
      'Total Purchase Amount',
      'Total Revenue',
      'Gross Profit'
    ]],
    body: payload.items.map((row, idx) => {
      const isProf = row.gross_profit >= 0;
      const profitStr = `${isProf ? '+' : ''}${rupee(row.gross_profit)} (${row.profit_margin.toFixed(1)}%)`;
      const productName = row.product?.nickname || 'Unknown Item';
      const supplierName = row.product?.supplier_item_name ? `\n${row.product.supplier_item_name}` : '';

      return [
        String(idx + 1),
        productName + supplierName,
        `${row.quantity} ${row.product?.uom || 'PAC'}`,
        rupee(row.purchase_price),
        rupee(row.selling_price),
        rupee(row.total_cogs),
        rupee(row.total_revenue),
        profitStr
      ];
    }),
    foot: [[
      '',
      `TOTALS (${payload.items.length} Products)`,
      `${totalQuantity} Units`,
      '—',
      '—',
      rupee(totalPurchaseSum),
      rupee(totalRevenueSum),
      `${totalProfitSum >= 0 ? '+' : ''}${rupee(totalProfitSum)} (${overallMargin.toFixed(1)}%)`
    ]],
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
      textColor: TEXT_SLATE,
      lineColor: BORDER_COLOR,
      lineWidth: 0.15,
      valign: 'middle',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 }
    },
    footStyles: {
      fillColor: [241, 245, 249], // Slate 100
      textColor: NAVY,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center', fontStyle: 'bold', textColor: TEXT_MUTED },
      1: { cellWidth: 78, halign: 'left', textColor: NAVY, fontStyle: 'bold' },
      2: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: TEXT_SLATE },
      6: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: BRAND_BLUE },
      7: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Color gross profit column in body and footer
      if (data.column.index === 7 && data.section === 'body') {
        const text = String(data.cell.raw || '');
        if (text.startsWith('+')) {
          data.cell.styles.textColor = PROFIT_GREEN;
        } else if (text.startsWith('-')) {
          data.cell.styles.textColor = LOSS_RED;
        }
      } else if (data.column.index === 7 && data.section === 'foot') {
        data.cell.styles.textColor = totalProfitSum >= 0 ? PROFIT_GREEN : LOSS_RED;
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 4. FOOTER (PAGINATION & BRANDING)
  // ---------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);

    const footerY = pageH - 5.5;
    doc.text(
      `Confidential — ${business} Purchase & Revenue Intelligence`,
      margin,
      footerY
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageW - margin,
      footerY,
      { align: 'right' }
    );
  }

  // Save PDF
  const cleanPeriod = payload.periodLabel.replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `Revenue_Profit_Report_${cleanPeriod}_${todayStr}.pdf`;
  doc.save(filename);
}
