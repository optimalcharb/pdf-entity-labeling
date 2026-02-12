import { PdfDocumentObject, Rotation } from "@embedpdf/models"
import { PageLayout } from "../lib"

export interface RenderPageProps extends PageLayout {
  rotation: Rotation
  scale: number
  document: PdfDocumentObject | null
}
