import { useEffect } from "react"
import { useAnnotationCapability } from "../../pdf-container/plugin-annotation-2"
import { useScrollCapability } from "../../pdf-container/plugin-scroll-2"
import { useSelectionCapability } from "../../pdf-container/plugin-selection-2"
import usePluginStore from "../hooks/use-plugin-store"

const PluginStoreSync = () => {
  const { provides: annoCapability } = useAnnotationCapability()
  const { provides: selectCapability } = useSelectionCapability()
  const { provides: scrollCapability } = useScrollCapability()

  useEffect(() => {
    if (!annoCapability || !selectCapability || !scrollCapability) return

    const store = usePluginStore.getState()

    // initialize capabilities (which are static)
    store.setAnnoCapability(annoCapability)
    store.setSelectCapability(selectCapability)
    store.setScrollCapability(scrollCapability)

    // sync store with changes
    const syncState = annoCapability.onStateChange((state) => {
      store.setAnnoState(state)
    })

    return () => {
      syncState()
      // clear store values when unmounting
      store.setAnnoCapability(null)
      store.setAnnoState(null)
      store.setSelectCapability(null)
      store.setScrollCapability(null)
    }
  }, [annoCapability, selectCapability, scrollCapability])

  return null
}
export default PluginStoreSync
