import type { InteractionExclusionRules } from "./custom-types"

// ***PLUGIN STATE***
export interface InteractionManagerState {
  /** Mode-id that is currently active (e.g. `"default"` or `"annotationCreation"`). */
  activeMode: string
  /** Cursor that is currently active (e.g. `"auto"` or `"pointer"`). */
  cursor: string
  /** Whether the interaction is paused */
  paused: boolean
  /** Mode-id that is treated as the resolver’s fall-back (“finish → …”). */
  defaultMode: string
  /** Exclusion rules for interaction */
  exclusionRules: InteractionExclusionRules
}

// ***INITIAL STATE***
export const initialState: InteractionManagerState = {
  activeMode: "pointerMode",
  defaultMode: "pointerMode",
  cursor: "auto",
  paused: false,
  exclusionRules: {
    classes: [],
    dataAttributes: [],
  },
}
