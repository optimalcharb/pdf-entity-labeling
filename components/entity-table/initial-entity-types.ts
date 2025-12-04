import { PdfAnnotationSubtype } from "@embedpdf/models"
import type { EntityType } from "./entity-type"

const initialEntityTypes: EntityType[] = [
  {
    name: "Highlight",
    subtype: PdfAnnotationSubtype.HIGHLIGHT,
    color: "#FF0000",
    opacity: 0.8,
    unique: true,
    required: true,
  },
  {
    name: "Squiggly",
    subtype: PdfAnnotationSubtype.SQUIGGLY,
    color: "#00FF00",
    opacity: 1,
    unique: true,
    required: true,
  },
  {
    name: "Underline",
    subtype: PdfAnnotationSubtype.UNDERLINE,
    color: "#0000FF",
    opacity: 1,
    unique: true,
    required: true,
  },
  {
    name: "StrikeOut",
    subtype: PdfAnnotationSubtype.STRIKEOUT,
    color: "#FF00FF",
    opacity: 1,
    unique: true,
    required: true,
  },
]

export default initialEntityTypes
