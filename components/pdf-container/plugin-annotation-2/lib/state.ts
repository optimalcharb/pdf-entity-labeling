import type { TrackedAnnotation } from "./custom-types"
import type { AnnotationTool } from "./tools/annotation-tool"
import { initialTools } from "./tools/initial-tools"

export interface AnnotationState {
  pages: Record<number, string[]>
  byUid: Record<string, TrackedAnnotation>
  selectedUid: string | null
  activeToolId: string | null
  tools: AnnotationTool[]
  hasPendingChanges: boolean
}

export const initialState: AnnotationState = {
  pages: {},
  byUid: {},
  selectedUid: null,
  activeToolId: null,
  tools: initialTools,
  hasPendingChanges: false,
}
