/**
 * Date and Time utilities configured for Indian Standard Time (IST / Asia/Kolkata)
 */

/**
 * Returns the current date in Indian Standard Time formatted as YYYY-MM-DD.
 * Ensures the date matches the Indian calendar day regardless of server/browser UTC offset.
 */
export const getTodayIST = (date: Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    // Fallback using local date components
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
};

export const formatDisplayDate = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '-';
  try {
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      // Already DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
      }
      // Match exact YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-');
        return `${d}/${m}/${y}`;
      }
      // Match YYYY/MM/DD
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('/');
        return `${d}/${m}/${y}`;
      }
      // Match YYYY-MM-DDTHH:mm:ss
      if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
        const datePart = trimmed.split('T')[0];
        const [y, m, d] = datePart.split('-');
        return `${d}/${m}/${y}`;
      }
    }
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch {
    return String(dateInput);
  }
};

/**
 * Generates an invoice number prefixed with the current IST date code in DDMMYYYY format:
 * e.g. INV-08102026-0001 or INV-08102026-0042
 */
export const generateISTInvoiceNumber = (date: Date = new Date(), sequence?: number): string => {
  const [y, m, d] = getTodayIST(date).split('-');
  const istDateCompact = `${d}${m}${y}`;
  const suffix = typeof sequence === 'number'
    ? String(sequence).padStart(4, '0')
    : String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `INV-${istDateCompact}-${suffix}`;
};

/**
 * Formats an ISO string or date into localized Indian display format with Day/Month/Year order:
 * e.g. '06 Oct 2026, 01:02 AM'
 */
export const formatISTTimestamp = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return String(dateInput);
  }
};

/**
 * Formats a month key (e.g. '2026-10') or Date into 'Oct 2026' (Month Year format)
 */
export const formatDisplayMonthYear = (monthInput?: string | Date | null): string => {
  if (!monthInput) return '-';
  try {
    if (typeof monthInput === 'string' && /^\d{4}-\d{2}$/.test(monthInput.trim())) {
      const [y, m] = monthInput.trim().split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(m, 10) - 1;
      return `${monthNames[monthIdx] || m} ${y}`;
    }
    const d = typeof monthInput === 'string' ? new Date(monthInput) : monthInput;
    if (isNaN(d.getTime())) return String(monthInput);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return String(monthInput);
  }
};


