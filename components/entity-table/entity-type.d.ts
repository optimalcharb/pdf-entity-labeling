import { PdfAnnotationSubtype } from "@embedpdf/models"

export interface EntityType {
  name: string
  subtype: PdfAnnotationSubtype
  color: string
  opacity: number
  unique: boolean
  required: boolean
}
