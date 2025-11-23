import { CSSProperties, Fragment, ReactNode, useEffect, useRef } from "react"
import { Rect, Rotation } from "@embedpdf/models"

interface CounterTransformResult {
  matrix: string // CSS matrix(a,b,c,d,e,f)
  width: number // new width
  height: number // new height
}

/**
 * Given an already-placed rect (left/top/width/height in px) and the page rotation,
 * return the counter-rotation matrix + adjusted width/height.
 *
 * transform-origin is expected to be "0 0".
 * left/top DO NOT change, apply them as-is.
 */
export function getCounterRotation(rect: Rect, rotation: Rotation): CounterTransformResult {
  const { width: w, height: h } = rect.size

  switch (rotation % 4) {
    case 1: // 90° cw → need matrix(0,-1,1,0,0,h) and swap w/h
      return {
        matrix: `matrix(0, -1, 1, 0, 0, ${h})`,
        width: h,
        height: w,
      }

    case 2: // 180° → matrix(-1,0,0,-1,w,h), width/height unchanged
      return {
        matrix: `matrix(-1, 0, 0, -1, ${w}, ${h})`,
        width: w,
        height: h,
      }

    case 3: // 270° cw → matrix(0,1,-1,0,w,0), swap w/h
      return {
        matrix: `matrix(0, 1, -1, 0, ${w}, 0)`,
        width: h,
        height: w,
      }

    default:
      return {
        matrix: `matrix(1, 0, 0, 1, 0, 0)`,
        width: w,
        height: h,
      }
  }
}

interface CounterRotateProps {
  rect: Rect
  rotation: Rotation
}

export interface MenuWrapperProps {
  style: CSSProperties
  ref: (el: HTMLDivElement | null) => void
}

interface CounterRotateComponentProps extends CounterRotateProps {
  children: (props: { matrix: string; rect: Rect; menuWrapperProps: MenuWrapperProps }) => ReactNode
}

export function CounterRotate({ children, ...props }: CounterRotateComponentProps) {
  const { rect, rotation } = props
  const { matrix, width, height } = getCounterRotation(rect, rotation)
  const elementRef = useRef<HTMLDivElement | null>(null)

  // Use native event listeners with capture phase to prevent event propagation
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handlePointerDown = (e: Event) => {
      // Stop propagation to prevent underlying layers from receiving the event
      e.stopPropagation()
      // DO NOT use e.preventDefault() here - it breaks click events on mobile/tablet!
      // preventDefault() stops the browser from generating click events from touch,
      // which makes buttons inside this container non-functional on touch devices.
    }

    const handleTouchStart = (e: Event) => {
      // Stop propagation to prevent underlying layers from receiving the event
      e.stopPropagation()
      // DO NOT use e.preventDefault() here - it breaks click events on mobile/tablet!
      // preventDefault() stops the browser from generating click events from touch,
      // which makes buttons inside this container non-functional on touch devices.
    }

    // Use capture phase to intercept before synthetic events
    element.addEventListener("pointerdown", handlePointerDown, { capture: true })
    element.addEventListener("touchstart", handleTouchStart, { capture: true })

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown, { capture: true })
      element.removeEventListener("touchstart", handleTouchStart, { capture: true })
    }
  }, [])

  const menuWrapperStyle: CSSProperties = {
    position: "absolute",
    left: rect.origin.x,
    top: rect.origin.y,
    transform: matrix,
    transformOrigin: "0 0",
    width: width,
    height: height,
    pointerEvents: "none",
    zIndex: 3,
  }

  const menuWrapperProps: MenuWrapperProps = {
    style: menuWrapperStyle,
    ref: (el: HTMLDivElement | null) => {
      elementRef.current = el
    },
  }

  return (
    <Fragment>
      {children({
        menuWrapperProps,
        matrix,
        rect: {
          origin: { x: rect.origin.x, y: rect.origin.y },
          size: { width: width, height: height },
        },
      })}
    </Fragment>
  )
}
