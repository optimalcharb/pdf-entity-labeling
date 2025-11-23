import { useInteractionManagerCapability } from "./use-interaction-manager"

export function useCursor() {
  const { provides } = useInteractionManagerCapability()
  return {
    setCursor: (token: string, cursor: string, prio = 0) => {
      provides?.setCursor(token, cursor, prio)
    },
    removeCursor: (token: string) => {
      provides?.removeCursor(token)
    },
  }
}
