import type { PdfAnnotationObject } from "@embedpdf/models"

export type AnnotationTool<T extends PdfAnnotationObject = PdfAnnotationObject> = {
  id: string
  interaction: {
    mode?: string
    exclusive: boolean
    cursor?: string
    textSelection?: boolean
  }
  defaults: Partial<T>
}
