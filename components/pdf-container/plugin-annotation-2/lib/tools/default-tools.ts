import { PdfAnnotationSubtype, PdfBlendMode } from "@embedpdf/models"
import { AnnotationTool } from "./types"

export const defaultTools = [
  {
    id: "highlight" as const,
    interaction: {
      exclusive: false,
      textSelection: true,
      mode: "highlight",
      cursor: "text",
    },
    defaults: {
      type: PdfAnnotationSubtype.HIGHLIGHT,
      color: "#FFCD45",
      opacity: 0.6,
      blendMode: PdfBlendMode.Multiply,
    },
  },
  {
    id: "underline" as const,
    interaction: {
      exclusive: false,
      textSelection: true,
      mode: "underline",
      cursor: "text",
    },
    defaults: {
      type: PdfAnnotationSubtype.UNDERLINE,
      color: "#E44234",
      opacity: 1,
    },
  },
  {
    id: "strikeout" as const,
    interaction: {
      exclusive: false,
      textSelection: true,
      mode: "strikeout",
      cursor: "text",
    },
    defaults: {
      type: PdfAnnotationSubtype.STRIKEOUT,
      color: "#E44234",
      opacity: 1,
    },
  },
  {
    id: "squiggly" as const,
    interaction: {
      exclusive: false,
      textSelection: true,
      mode: "squiggly",
      cursor: "text",
    },
    defaults: {
      type: PdfAnnotationSubtype.SQUIGGLY,
      color: "#E44234",
      opacity: 1,
    },
  },
] satisfies readonly AnnotationTool[]
