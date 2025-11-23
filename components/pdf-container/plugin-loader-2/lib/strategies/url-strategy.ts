import { PdfDocumentObject } from "@embedpdf/models"
import { PDFLoadingStrategy, PDFUrlLoadingOptions } from "./loading-strategy"

export class UrlStrategy implements PDFLoadingStrategy {
  async load(loadingOptions: PDFUrlLoadingOptions): Promise<PdfDocumentObject> {
    const { pdfFile, options, engine } = loadingOptions

    const task = engine.openDocumentUrl(pdfFile, options)

    return new Promise<PdfDocumentObject>((resolve, reject) => {
      task.wait(
        // Success callback
        (result) => resolve(result),
        // Error callback
        (error) => {
          if (error.type === "abort") {
            reject(new Error(`PDF loading aborted: ${error.reason}`))
          } else {
            reject(new Error(`PDF loading failed: ${error.reason}`))
          }
        },
      )
    })
  }
}
