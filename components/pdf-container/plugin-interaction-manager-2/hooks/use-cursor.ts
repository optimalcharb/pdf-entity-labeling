import { useInteractionManagerCapability } from "./use-interaction-manager"

export function useCursor(documentId: string) {
  const { provides } = useInteractionManagerCapability()
  return {
    setCursor: (token: string, cursor: string, prio = 0) => {
      if (!provides) return
      const scope = provides.forDocument(documentId)
      scope.setCursor(token, cursor, prio)
    },
    removeCursor: (token: string) => {
      if (!provides) return
      const scope = provides.forDocument(documentId)
      scope.removeCursor(token)
    },
  }
}