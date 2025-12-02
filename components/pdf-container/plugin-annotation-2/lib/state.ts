import { PdfAnnotationSubtype } from "@embedpdf/models"
import type { TrackedAnnotation } from "./custom-types"

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
  activeSubtype: PdfAnnotationSubtype | null
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
