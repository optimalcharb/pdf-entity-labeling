import { useEffect, useState } from "react"
import { useInteractionManagerCapability } from "./use-interaction-manager"

export function useIsPageExclusive(documentId: string) {
  const { provides: cap } = useInteractionManagerCapability()

  const [isPageExclusive, setIsPageExclusive] = useState<boolean>(() => {
    if (!cap) return false
    const scope = cap.forDocument(documentId)
    const m = scope.getActiveInteractionMode()
    return m?.scope === "page" && !!m.exclusive
  })

  useEffect(() => {
    if (!cap) return

    const scope = cap.forDocument(documentId)

    return scope.onModeChange(() => {
      const mode = scope.getActiveInteractionMode()
      setIsPageExclusive(mode?.scope === "page" && !!mode?.exclusive)
    })
  }, [cap, documentId])

  return isPageExclusive
}