// Professional, responsive HTML email for cheque clearance reminders.
// Table-based layout + inline styles for maximum email-client compatibility.

export interface ChequeReminderEmailData {
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  chequePresentationDate?: string | null;
  reminderAtIso: string;
}

const BRAND = '#1E40AF';
const BRAND_DARK = '#1E3A8A';

const formatINR = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

/** Format a YYYY-MM-DD calendar date as "DD MMM YYYY" (no timezone shift). */
const formatCalendarDate = (date?: string | null): string => {
  if (!date) return '—';
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
};

/** Format a UTC ISO timestamp in IST (Asia/Kolkata). */
const formatIST = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(d);
};

export const buildChequeReminderEmail = (
  data: ChequeReminderEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Cheque reminder — Invoice ${data.invoiceNumber} (${formatINR(data.amount)})`;
  const clearance = formatCalendarDate(data.chequePresentationDate);
  const reminderTime = `${formatIST(data.reminderAtIso)} IST`;

  const rows: Array<[string, string]> = [
    ['Invoice number', data.invoiceNumber],
    ['Supplier', data.supplierName || '—'],
    ['Invoice amount', formatINR(data.amount)],
    ['Cheque presentation date', clearance],
    ['Reminder scheduled for', reminderTime],
  ];

  const rowsHtml = rows
    .map(
      ([label, value], i) => `
        <tr>
          <td style="padding:12px 16px;background:${i % 2 === 0 ? '#F8FAFC' : '#FFFFFF'};border-bottom:1px solid #E2E8F0;font-size:13px;color:#64748B;width:46%;">${label}</td>
          <td style="padding:12px 16px;background:${i % 2 === 0 ? '#F8FAFC' : '#FFFFFF'};border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${value}</td>
        </tr>`
    )
    .join('');

  const text = [
    'Cheque payment reminder',
    '',
    `Invoice number: ${data.invoiceNumber}`,
    `Supplier: ${data.supplierName || '—'}`,
    `Invoice amount: ${formatINR(data.amount)}`,
    `Cheque presentation date: ${clearance}`,
    `Reminder scheduled for: ${reminderTime}`,
    '',
    'This is an automated reminder from the Purchase Audit & Order Intelligence System.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND};padding:24px 28px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#BFDBFE;font-weight:600;">Audit &amp; Planner</p>
              <p style="margin:6px 0 0;font-size:20px;color:#FFFFFF;font-weight:700;">Cheque payment reminder</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 4px;font-size:15px;color:#0F172A;font-weight:600;">Upcoming cheque presentation</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
                This is a reminder that a cheque payment for the invoice below is due to be presented. Please ensure sufficient funds are available.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                ${rowsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.6;color:${BRAND_DARK};">
                    All dates and times are shown in Indian Standard Time (IST, Asia/Kolkata).
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:18px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94A3B8;">
                Automated message from the Purchase Audit &amp; Order Intelligence System. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
};
