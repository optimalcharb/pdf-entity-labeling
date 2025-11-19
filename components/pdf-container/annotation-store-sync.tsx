import useAnnotationStore from "@/hooks/annotation-store/use-annotation-store"
import { useEffect } from "react"
import { useAnnotationCapability } from "./plugin-annotation-2"

const AnnotationStoreSync = () => {
  const { provides: annoCapability } = useAnnotationCapability()

  useEffect(() => {
    if (!annoCapability) return

    const store = useAnnotationStore.getState()

    // initialize
    store.setCapability(annoCapability)
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
      store.setCapability(null)
    }
  }, [annoCapability])

  return null
}

export default AnnotationStoreSync
