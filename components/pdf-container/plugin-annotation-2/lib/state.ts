import type { TrackedAnnotation } from "./custom-types"
import type { AnnotationTool } from "./tools/annotation-tool"
import { initialTools } from "./tools/initial-tools"

// ***PLUGIN STATE***
export interface AnnotationState {
  pages: Record<number, string[]>
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
  pages: {},
  byUid: {},
  selectedUid: null,
  activeToolId: null,
  tools: initialTools,
  hasPendingChanges: false,
  canUndo: false,
  canRedo: false,
}
