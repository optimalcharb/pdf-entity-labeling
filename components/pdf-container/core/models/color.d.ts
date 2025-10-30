import { PdfAlphaColor, PdfColor } from "./pdf"
/**
 * Web color as hex string (no opacity)
 */
export type WebColor = string
export interface WebAlphaColor {
  color: string
  opacity: number
}
/**
 * Convert a {@link PdfColor} to a CSS hex color string.
 *
 * @param c - the RGB color from PDFium (0-255 per channel)
 * @returns hex color string in format #RRGGBB
 */
export declare function pdfColorToWebColor(c: PdfColor): WebColor
/**
 * Convert a CSS hex color back to {@link PdfColor}
 *
 * @param color - #RGB, #RRGGBB, or #rrggbb
 */
export declare function webColorToPdfColor(color: WebColor): PdfColor
/**
 * Convert PDF alpha (0-255) to web opacity (0-1)
 */
export declare function pdfAlphaToWebOpacity(alpha: number): number
/**
 * Convert web opacity (0-1) to PDF alpha (0-255)
 */
export declare function webOpacityToPdfAlpha(opacity: number): number
/**
 * Extract color part from {@link PdfAlphaColor}
 */
export declare function extractPdfColor(c: PdfAlphaColor): PdfColor
/**
 * Extract alpha from {@link PdfAlphaColor} as web opacity
 */
export declare function extractWebOpacity(c: PdfAlphaColor): number
/**
 * Combine {@link PdfColor} and alpha to create {@link PdfAlphaColor}
 */
export declare function combinePdfColorWithAlpha(color: PdfColor, alpha: number): PdfAlphaColor
/**
 * Combine {@link WebColor} and opacity to create {@link WebAlphaColor}
 */
export declare function combineWebColorWithOpacity(color: WebColor, opacity: number): WebAlphaColor
/**
 * Convert a {@link PdfAlphaColor} to a CSS-style colour definition.
 *
 * @param c - the colour coming from PDFium (0-255 per channel)
 * @returns
 *   hex   – #RRGGBB (no alpha channel)
 *   opacity – 0-1 float suitable for CSS `opacity`/`rgba()`
 */
export declare function pdfAlphaColorToWebAlphaColor(c: PdfAlphaColor): WebAlphaColor
/**
 * Convert a CSS hex colour + opacity back into {@link PdfAlphaColor}
 *
 * @param hex      - #RGB, #RRGGBB, or #rrggbb
 * @param opacity  - 0-1 float (values outside clamp automatically)
 */
export declare function webAlphaColorToPdfAlphaColor({
  color,
  opacity,
}: WebAlphaColor): PdfAlphaColor
