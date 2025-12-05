import { PdfAnnotationSubtype } from "@embedpdf/models"
import type { TrackedAnnotation } from "./custom-types"

// so consumers can use string instead of PdfAnnotationSubtype enum
export type Subtype = "highlight" | "underline" | "squiggly" | "strikeout"

// so plugin code can use the enum
export function subtypeToEnum(subtype: Subtype): PdfAnnotationSubtype {
  switch (subtype) {
    case "highlight":
      return PdfAnnotationSubtype.HIGHLIGHT
    case "underline":
      return PdfAnnotationSubtype.UNDERLINE
    case "squiggly":
      return PdfAnnotationSubtype.SQUIGGLY
    case "strikeout":
      return PdfAnnotationSubtype.STRIKEOUT
  }
}

// ***PLUGIN STATE***
export interface AnnotationState {
  // page index -> annotation uids
  byPage: Record<number, string[]>
  // annotation uid -> tracked annotation object
  byUid: Record<string, TrackedAnnotation>
  // entity type -> annotation uids
  byEntityType: Record<string, string[]>
  selectedUid: string | null
  hasPendingChanges: boolean
  activeColor: string
  activeOpacity: number
  activeSubtype: Subtype | null
  activeEntityType: string
  canUndo: boolean
  canRedo: boolean
}

// ***INITIAL STATE***
export const initialState: AnnotationState = {
  byPage: {},
  byUid: {},
  byEntityType: {},
  selectedUid: null,
  hasPendingChanges: false,
  activeColor: "#FFCD45",
  activeOpacity: 0.5,
  activeSubtype: null,
  activeEntityType: "",
  canUndo: false,
  canRedo: false,
}
