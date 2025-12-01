import {
  PdfHighlightAnnoObject,
  PdfSquigglyAnnoObject,
  PdfStrikeOutAnnoObject,
  PdfUnderlineAnnoObject,
} from "@embedpdf/models"

export type PdfTextMarkupAnnotationObject =
  | PdfHighlightAnnoObject
  | PdfUnderlineAnnoObject
  | PdfStrikeOutAnnoObject
  | PdfSquigglyAnnoObject
