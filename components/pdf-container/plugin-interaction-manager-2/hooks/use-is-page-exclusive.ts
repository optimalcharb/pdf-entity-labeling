import { useEffect, useState } from "react"
import { useInteractionManagerCapability } from "./use-interaction-manager"

export function useIsPageExclusive() {
  const { provides: cap } = useInteractionManagerCapability()

  const [isPageExclusive, setIsPageExclusive] = useState<boolean>(() => {
    const m = cap?.getActiveInteractionMode()
    return m?.scope === "page" && !!m.exclusive
  })

  useEffect(() => {
    if (!cap) return

    return cap.onModeChange(() => {
      const mode = cap.getActiveInteractionMode()
      setIsPageExclusive(mode?.scope === "page" && !!mode?.exclusive)
    })
  }, [cap])

  return isPageExclusive
}
