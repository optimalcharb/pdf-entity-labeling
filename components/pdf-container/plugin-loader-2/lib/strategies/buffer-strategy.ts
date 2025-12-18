import { PdfDocumentObject } from "@embedpdf/models"
import { PDFBufferLoadingOptions, PDFLoadingStrategy } from "./loading-strategy"

export class BufferStrategy implements PDFLoadingStrategy {
  async load(loadingOptions: PDFBufferLoadingOptions): Promise<PdfDocumentObject> {
    const { pdfFile, options, engine } = loadingOptions

    const task = engine.openDocumentBuffer(pdfFile, options)

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
