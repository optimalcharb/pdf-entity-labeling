import type { PdfTextMarkupAnnotationObject } from "../pdf-text-markup-annotation-object"

export type AnnotationTool = {
  id: string
  interaction: {
    mode?: string
    exclusive: boolean
    cursor?: string
    textSelection?: boolean
  }
  defaults: Partial<PdfTextMarkupAnnotationObject>
}
