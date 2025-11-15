import type { PdfAnnotationObject } from "@embedpdf/models"

export type AnnotationTool = {
  id: string
  interaction: {
    mode?: string
    exclusive: boolean
    cursor?: string
    textSelection?: boolean
  }
  defaults: Partial<PdfAnnotationObject>
}
