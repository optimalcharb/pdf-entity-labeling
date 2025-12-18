import {
  PdfDocumentObject,
  PdfEngine,
  PdfFile,
  PdfFileUrl,
  PdfOpenDocumentBufferOptions,
  PdfOpenDocumentUrlOptions,
} from "@embedpdf/models"

// Loading Options
export interface PDFUrlLoadingOptions {
  type: "url"
  pdfFile: PdfFileUrl
  options?: PdfOpenDocumentUrlOptions
  engine: PdfEngine
}

export interface PDFBufferLoadingOptions {
  type: "buffer"
  pdfFile: PdfFile
  options?: PdfOpenDocumentBufferOptions
  engine: PdfEngine
}

export type PDFLoadingOptions = PDFUrlLoadingOptions | PDFBufferLoadingOptions

// Predicates for loading options
export function isPDFUrlLoadingOptions(
  options: PDFLoadingOptions,
): options is PDFUrlLoadingOptions {
  return options.type === "url"
}

export function isPDFBufferLoadingOptions(
  options: PDFLoadingOptions,
): options is PDFBufferLoadingOptions {
  return options.type === "buffer"
}

// Interface for strategies
export interface PDFLoadingStrategy {
  load(options?: PDFLoadingOptions): Promise<PdfDocumentObject>
}
