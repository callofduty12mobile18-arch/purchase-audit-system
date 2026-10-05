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

/**
 * Generates an auto-increment style invoice number prefixed with the current IST date code:
 * e.g. INV-20261006-4821
 */
export const generateISTInvoiceNumber = (date: Date = new Date()): string => {
  const istDateCompact = getTodayIST(date).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${istDateCompact}-${randomSuffix}`;
};

/**
 * Formats an ISO string or date into localized Indian display format:
 * e.g. '06 Oct 2026, 01:02 AM'
 */
export const formatISTTimestamp = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
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
