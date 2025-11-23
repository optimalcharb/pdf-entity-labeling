import type { TrackedAnnotation } from "./custom-types"
import type { AnnotationTool } from "./tools/annotation-tool"
import { initialTools } from "./tools/initial-tools"

// ***PLUGIN STATE***
export interface AnnotationState {
  // page index -> annotation uids
  byPage: Record<number, string[]>
  // annotation uid -> tracked annotation object
  byUid: Record<string, TrackedAnnotation>
  selectedUid: string | null
  activeToolId: string | null
  tools: AnnotationTool[]
  hasPendingChanges: boolean
  canUndo: boolean
  canRedo: boolean
}

// ***INITIAL STATE***
export const initialState: AnnotationState = {
  byPage: {},
  byUid: {},
  selectedUid: null,
  activeToolId: null,
  tools: initialTools,
  hasPendingChanges: false,
  canUndo: false,
  canRedo: false,
}
