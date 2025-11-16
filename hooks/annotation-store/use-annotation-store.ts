import { create } from "zustand"

interface AnnotationStore {
  activeToolId: string | null
  selectedUid: string | null
  canUndo: boolean
  canRedo: boolean
  setActiveToolId: (toolId: string | null) => void
  setSelectedUid: (uid: string | null) => void
  setCanUndo: (canUndo: boolean) => void
  setCanRedo: (canRedo: boolean) => void
}

const useAnnotationStore = create<AnnotationStore>((set) => ({
  activeToolId: null,
  selectedUid: null,
  canUndo: false,
  canRedo: false,
  setActiveToolId: (activeToolId) => set({ activeToolId }),
  setSelectedUid: (selectedUid) => set({ selectedUid }),
  setCanUndo: (canUndo) => set({ canUndo }),
  setCanRedo: (canRedo) => set({ canRedo }),
}))
export default useAnnotationStore
