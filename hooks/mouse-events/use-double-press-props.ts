import { useCallback, useRef } from "react"

type DoublePressOptions = {
  delay?: number // ms between taps
  tolerancePx?: number // spatial tolerance
}

type DoubleHandler<T extends Element> = ((e: React.MouseEvent<T>) => void) | undefined

type DoubleProps<T extends Element> = {
  onDoubleClick?: (e: React.MouseEvent<T>) => void
  onPointerUpCapture?: (e: React.PointerEvent<T>) => void
}

// same as React's useDoubleClick with desktop mouse, otherwise adds mobile support
export function useDoublePressProps<T extends Element = Element>(
  onDouble?: DoubleHandler<T>,
  { delay = 300, tolerancePx = 18 }: DoublePressOptions = {},
): DoubleProps<T> {
  const last = useRef({ t: 0, x: 0, y: 0 })

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!onDouble) return

      // Ignore mouse (it will use native dblclick),
      // and ignore non-primary pointers (multi-touch, etc.)
      if (e.pointerType === "mouse" || e.isPrimary === false) return

      const now = performance.now()
      const x = e.clientX
      const y = e.clientY

      const withinTime = now - last.current.t <= delay
      const dx = x - last.current.x
      const dy = y - last.current.y
      const withinDist = dx * dx + dy * dy <= tolerancePx * tolerancePx

      if (withinTime && withinDist) onDouble?.(e)

      last.current = { t: now, x, y }
    },
    [onDouble, delay, tolerancePx],
  )

  return onDouble
    ? {
        onDoubleClick: onDouble,
        onPointerUpCapture: handlePointerUp,
      }
    : {}
}
