import { PdfAnnotationSubtype } from "@embedpdf/models"
import type { PdfTextMarkupAnnotationObject } from "./pdf-text-markup-annotation-object"

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

// ***PER-DOCUMENT STATE***
export interface AnnotationDocumentState {
  // page index -> annotation uids
  byPage: Record<number, string[]>
  // annotation uid -> annotation object
  byUid: Record<string, PdfTextMarkupAnnotationObject>
  // entity type -> annotation uids
  byEntityType: Record<string, string[]>
}

// ***PLUGIN STATE***
export interface AnnotationState {
  documents: Record<string, AnnotationDocumentState>
  activeDocumentId: string | null
  selectedUid: string | null
  activeColor: string
  activeOpacity: number
  activeSubtype: Subtype | null
  activeEntityType: string
  canUndo: boolean
  canRedo: boolean
}

// ***INITIAL STATES***
export const initialDocumentState: AnnotationDocumentState = {
  byPage: {},
  byUid: {},
  byEntityType: {},
}

export const initialState: AnnotationState = {
  documents: {},
  activeDocumentId: null,
  selectedUid: null,
  activeColor: "#FFCD45",
  activeOpacity: 0.5,
  activeSubtype: null,
  activeEntityType: "",
  canUndo: false,
  canRedo: false,
}
