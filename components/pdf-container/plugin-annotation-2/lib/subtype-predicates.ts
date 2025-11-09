import { PdfAnnotationObject, PdfAnnotationSubtype } from "@embedpdf/models"
import type { TrackedAnnotation } from "./custom-types"

/* ------------------------------------------------------------------ */
/* 1. Generic “subtype‑to‑object” mapper                              */
/* ------------------------------------------------------------------ */

type AnnoOf<S extends PdfAnnotationSubtype> = Extract<PdfAnnotationObject, { type: S }>

/* ------------------------------------------------------------------ */
/* 2. Narrowing type‑guards (add more as needed)                      */
/* ------------------------------------------------------------------ */
export function isHighlight(
  a: TrackedAnnotation,
): a is TrackedAnnotation<AnnoOf<PdfAnnotationSubtype.HIGHLIGHT>> {
  return a.object.type === PdfAnnotationSubtype.HIGHLIGHT
}

export function isUnderline(
  a: TrackedAnnotation,
): a is TrackedAnnotation<AnnoOf<PdfAnnotationSubtype.UNDERLINE>> {
  return a.object.type === PdfAnnotationSubtype.UNDERLINE
}

export function isStrikeout(
  a: TrackedAnnotation,
): a is TrackedAnnotation<AnnoOf<PdfAnnotationSubtype.STRIKEOUT>> {
  return a.object.type === PdfAnnotationSubtype.STRIKEOUT
}

export function isSquiggly(
  a: TrackedAnnotation,
): a is TrackedAnnotation<AnnoOf<PdfAnnotationSubtype.SQUIGGLY>> {
  return a.object.type === PdfAnnotationSubtype.SQUIGGLY
}
