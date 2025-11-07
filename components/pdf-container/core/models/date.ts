/**
 * Parse a PDF date string **D:YYYYMMDDHHmmSSOHH'mm'** to ISO-8601.
 *
 * Returns `undefined` if the input is malformed.
 *
 * @public
 */
export function pdfDateToDate(pdf?: string): Date | undefined {
  if (!pdf?.startsWith('D:') || pdf.length < 16) return;

  const y = +pdf.slice(2, 6);
  const mo = +pdf.slice(6, 8) - 1; // JS months: 0-based
  const d = +pdf.slice(8, 10);
  const H = +pdf.slice(10, 12);
  const M = +pdf.slice(12, 14);
  const S = +pdf.slice(14, 16);

  return new Date(Date.UTC(y, mo, d, H, M, S));
}

/**
 * Convert a date to a PDF date string
 * @param date - date to convert
 * @returns PDF date string
 *
 * @public
 */
export function dateToPdfDate(date: Date = new Date()): string {
  const z = (n: number, len = 2) => n.toString().padStart(len, '0');

  const YYYY = date.getUTCFullYear();
  const MM = z(date.getUTCMonth() + 1);
  const DD = z(date.getUTCDate());
  const HH = z(date.getUTCHours());
  const mm = z(date.getUTCMinutes());
  const SS = z(date.getUTCSeconds());

  return `D:${YYYY}${MM}${DD}${HH}${mm}${SS}`;
}
