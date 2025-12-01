import { PdfAnnotationSubtype } from "@embedpdf/models"
import type { TrackedAnnotation } from "./custom-types"

// ***PLUGIN STATE***
export interface AnnotationState {
  // page index -> annotation uids
  byPage: Record<number, string[]>
  // annotation uid -> tracked annotation object
  byUid: Record<string, TrackedAnnotation>
  selectedUid: string | null
  activeColor: string
  activeOpacity: number
  activeSubtype: PdfAnnotationSubtype | null
  activeEntityType: string
  hasPendingChanges: boolean
  canUndo: boolean
  canRedo: boolean
}

// ***INITIAL STATE***
export const initialState: AnnotationState = {
  byPage: {},
  byUid: {},
  selectedUid: null,
  activeColor: "#FFCD45",
  activeOpacity: 0.5,
  activeSubtype: null,
  activeEntityType: "",
  hasPendingChanges: false,
  canUndo: false,
  canRedo: false,
}
