import { useAnnotationCapability } from "@/components/pdf-container/plugin-annotation-2"
import { useEffect } from "react"
import useAnnotationStore from "./use-annotation-store"

const useSyncAnnotationStore = () => {
  const { provides: annoCapability } = useAnnotationCapability()
  useEffect(() => {
    if (!annoCapability) return

    // debug
    // console.log("Using Sync Annotation Store")

    const store = useAnnotationStore.getState()

    // initialize
    // store.setActiveToolId(annoCapability.getActiveToolId())
    // store.setSelectedUid(annoCapability.getSelectedUid())
    // store.setSelectedUid(annoCapability.getCanUndo())
    // store.setSelectedUid(annoCapability.getCanRedo())
    store.setActiveToolId(null)
    store.setSelectedUid(null)
    store.setCanUndo(false)
    store.setCanRedo(false)

    // sync store with changes
    const syncTool = annoCapability.onActiveToolChange((tool) =>
      store.setActiveToolId(tool?.id ?? null),
    )

    const syncState = annoCapability.onStateChange((state) => {
      store.setSelectedUid(state.selectedUid)
      store.setCanUndo(state.canUndo)
      store.setCanRedo(state.canRedo)
    })

    return () => {
      syncTool()
      syncState()
    }
  }, [annoCapability])

  return null
}
export default useSyncAnnotationStore
