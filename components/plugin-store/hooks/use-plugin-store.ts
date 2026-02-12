import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"
import {
  AnnotationCapability,
  AnnotationState,
} from "@/components/pdf-container/plugin-annotation-2"
import { ScrollCapability } from "@/components/pdf-container/plugin-scroll-2"
import { SelectionCapability } from "@/components/pdf-container/plugin-selection-2"

interface PluginStore {
  annoCapability: AnnotationCapability | null
  annoState: AnnotationState | null
  selectCapability: SelectionCapability | null
  scrollCapability: ScrollCapability | null
  setAnnoCapability: (capability: AnnotationCapability | null) => void
  setAnnoState: (state: AnnotationState | null) => void
  setSelectCapability: (capability: SelectionCapability | null) => void
  setScrollCapability: (capability: ScrollCapability | null) => void
}

// use entire store (rerenders on any state change)
const usePluginStore = create<PluginStore>((set) => ({
  annoCapability: null,
  annoState: null,
  selectCapability: null,
  scrollCapability: null,
  setAnnoCapability: (annoCapability) => set({ annoCapability }),
  setAnnoState: (annoState) => set({ annoState }),
  setSelectCapability: (selectCapability) => set({ selectCapability }),
  setScrollCapability: (scrollCapability) => set({ scrollCapability }),
}))
export default usePluginStore

// use only capabilities (only rerenders when capabilities are set, which should be exactly once in plugin-store-sync)
export const usePluginCapabilities = () =>
  usePluginStore(
    useShallow((state: PluginStore) => ({
      annoCapability: state.annoCapability,
      selectCapability: state.selectCapability,
      scrollCapability: state.scrollCapability,
    })),
  )
