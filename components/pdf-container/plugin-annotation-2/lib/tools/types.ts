import type { PdfAnnotationObject } from "@embedpdf/models"

export type AnnotationTool<T extends PdfAnnotationObject = PdfAnnotationObject> = {
  id: string

  defaults: Partial<T>

  /** Defines how this tool interacts with the viewer. */
  interaction: {
    mode?: string
    exclusive: boolean
    cursor?: string
    textSelection?: boolean
  }
}
