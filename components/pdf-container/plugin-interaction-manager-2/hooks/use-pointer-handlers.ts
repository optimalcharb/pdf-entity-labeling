import { PointerEventHandlersWithLifecycle } from "../lib"
import { useInteractionManagerCapability } from "./use-interaction-manager"

interface UsePointerHandlersOptions {
  modeId?: string | string[]
  pageIndex?: number
}

export function usePointerHandlers({ modeId, pageIndex }: UsePointerHandlersOptions) {
  const { provides } = useInteractionManagerCapability()
  return {
    register: (
      handlers: PointerEventHandlersWithLifecycle,
      options?: { modeId?: string | string[]; pageIndex?: number },
    ) => {
      // Use provided options or fall back to hook-level options
      const finalModeId = options?.modeId ?? modeId
      const finalPageIndex = options?.pageIndex ?? pageIndex

      return finalModeId
        ? provides?.registerHandlers({
            modeId: finalModeId,
            handlers,
            pageIndex: finalPageIndex,
          })
        : provides?.registerAlways({
            scope:
              finalPageIndex !== undefined
                ? { type: "page", pageIndex: finalPageIndex }
                : { type: "global" },
            handlers,
          })
    },
  }
}
