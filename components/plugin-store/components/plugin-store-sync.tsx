import { useEffect } from "react"
import { useAnnotationCapability } from "../../pdf-container/plugin-annotation-2"
import usePluginStore from "../hooks/use-plugin-store"

const PluginStoreSync = () => {
  const { provides: annoCapability } = useAnnotationCapability()
  useEffect(() => {
    if (!annoCapability) return

    const store = usePluginStore.getState()

    // initialize capabilities (which are static)
    store.setAnnoCapability(annoCapability)

    // sync store with changes
    const syncState = annoCapability.onStateChange((state) => {
      store.setAnnoState(state)
    })

    return () => {
      syncState()
      // clear store values when unmounting
      store.setAnnoCapability(null)
      store.setAnnoState(null)
    }
  }, [annoCapability])

  return null
}
export default PluginStoreSync
