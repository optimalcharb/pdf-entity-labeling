/**
 * Parse a PDF date string **D:YYYYMMDDHHmmSSOHH'mm'** to ISO-8601.
 *
 * Returns `undefined` if the input is malformed.
 *
 * @public
 */
export declare function pdfDateToDate(pdf?: string): Date | undefined
/**
 * Convert a date to a PDF date string
 * @param date - date to convert
 * @returns PDF date string
 *
 * @public
 */
export declare function dateToPdfDate(date?: Date): string
