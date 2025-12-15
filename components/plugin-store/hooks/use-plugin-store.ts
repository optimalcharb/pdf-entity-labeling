import { AnnotationCapability } from "@/components/pdf-container/plugin-annotation-2/lib/plugin"
import { AnnotationState } from "@/components/pdf-container/plugin-annotation-2/lib/state"
import { create } from "zustand"

interface PluginStore {
  annoCapability: AnnotationCapability | null
  annoState: AnnotationState | null
  setAnnoCapability: (capability: AnnotationCapability | null) => void
  setAnnoState: (state: AnnotationState | null) => void
}

// use entire store (rerenders on any state change)
const usePluginStore = create<PluginStore>((set) => ({
  annoCapability: null,
  annoState: null,
  setAnnoCapability: (annoCapability) => set({ annoCapability }),
  setAnnoState: (annoState) => set({ annoState }),
}))
export default usePluginStore
