import type { PointerEventHandlersWithLifecycle } from "../lib"
import { useInteractionManagerCapability } from "./use-interaction-manager"

interface UsePointerHandlersOptions {
  modeId?: string | string[]
  pageIndex?: number
  documentId: string
}

export function usePointerHandlers({ modeId, pageIndex, documentId }: UsePointerHandlersOptions) {
  const { provides } = useInteractionManagerCapability()
  return {
    register: (
      handlers: PointerEventHandlersWithLifecycle,
      options?: { modeId?: string | string[]; pageIndex?: number; documentId?: string },
    ) => {
      // Use provided options or fall back to hook-level options
      const finalModeId = options?.modeId ?? modeId
      const finalPageIndex = options?.pageIndex ?? pageIndex
      const finalDocumentId = options?.documentId ?? documentId

      return finalModeId
        ? provides?.registerHandlers({
            modeId: finalModeId,
            handlers,
            pageIndex: finalPageIndex,
            documentId: finalDocumentId,
          })
        : provides?.registerAlways({
            scope:
              finalPageIndex !== undefined
                ? { type: "page", documentId: finalDocumentId, pageIndex: finalPageIndex }
                : { type: "global", documentId: finalDocumentId },
            handlers,
          })
    },
  }
}