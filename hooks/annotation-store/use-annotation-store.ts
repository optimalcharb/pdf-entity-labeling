import { AnnotationCapability } from "@/components/pdf-container/plugin-annotation-2/lib/plugin"
import { create } from "zustand"

interface AnnotationStore {
  capability: AnnotationCapability | null
  activeToolId: string | null
  selectedUid: string | null
  canUndo: boolean
  canRedo: boolean
  setCapability: (capability: AnnotationCapability | null) => void
  setActiveToolId: (toolId: string | null) => void
  setSelectedUid: (uid: string | null) => void
  setCanUndo: (canUndo: boolean) => void
  setCanRedo: (canRedo: boolean) => void
}

const useAnnotationStore = create<AnnotationStore>((set) => ({
  capability: null,
  activeToolId: null,
  selectedUid: null,
  canUndo: false,
  canRedo: false,
  setCapability: (capability) => set({ capability }),
  setActiveToolId: (activeToolId) => set({ activeToolId }),
  setSelectedUid: (selectedUid) => set({ selectedUid }),
  setCanUndo: (canUndo) => set({ canUndo }),
  setCanRedo: (canRedo) => set({ canRedo }),
}))
export default useAnnotationStore
