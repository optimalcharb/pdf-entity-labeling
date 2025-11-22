import { Rect } from "@embedpdf/models"
import { TrackedAnnotation, useAnnotationCapability } from "@embedpdf/plugin-annotation/preact"
import { ScrollCapability, useScrollCapability } from "@embedpdf/plugin-scroll/preact"
import { useSelectionCapability } from "@embedpdf/plugin-selection/preact"
import {
  useViewportCapability,
  ViewportCapability,
  ViewportMetrics,
} from "@embedpdf/plugin-viewport/preact"
import {
  ComponentRenderFunction,
  FloatingComponentProps,
  useUICapability,
} from "./preact-ui-plugin"

import { ComponentChildren, h, JSX, Ref, VNode } from "preact"

// eslint-disable-next-line import/no-unresolved
import { icons } from "../icons" // file not included, includes basic preact created icons

type IconProps = JSX.HTMLAttributes<HTMLElement> & {
  icon: string
  size?: number
  strokeWidth?: number
  primaryColor?: string
  secondaryColor?: string
  className?: string
  title?: string
}

/**
 * Icon component for Preact
 * Renders an icon using the new component-based icon system
 */
function Icon({
  icon,
  title,
  size = 24,
  strokeWidth = 2,
  primaryColor = "currentColor",
  secondaryColor,
  className,
  ...props
}: IconProps): VNode | null {
  const IconComponent = icons[icon]

  if (!IconComponent) {
    console.warn(`Icon not found: ${icon}`)
    return null
  }

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      className={className}
      title={title}
      {...props}
    />
  )
}

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  id?: string
  children: ComponentChildren
  onClick?: h.JSX.MouseEventHandler<HTMLButtonElement> | undefined
  active?: boolean
  disabled?: boolean
  className?: string
  tooltip?: string
  ref?: Ref<HTMLButtonElement>
}

function Button({
  id,
  children,
  onClick,
  active = false,
  disabled = false,
  className = "",
  tooltip,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      id={id}
      ref={ref}
      onClick={onClick}
      className={`flex h-[32px] w-auto min-w-[32px] items-center justify-center rounded-md p-[5px] transition-colors ${
        active
          ? "border-none bg-blue-50 text-blue-500 shadow ring ring-blue-500"
          : "hover:bg-gray-100 hover:ring hover:ring-[#1a466b]"
      } ${disabled ? "cursor-not-allowed opacity-50 hover:bg-transparent hover:ring-0" : "cursor-pointer"} ${className} `}
      title={tooltip}
      {...props}
    >
      {children}
    </button>
  )
}

type AnnotationMenuProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "style"> & {
  trackedAnnotation: TrackedAnnotation
  style?: JSX.CSSProperties
}

export const AnnotationMenu = ({ trackedAnnotation, ...props }: AnnotationMenuProps) => {
  const { provides: annotationCapability } = useAnnotationCapability()
  const { provides: ui } = useUICapability()

  const handleDeleteClick = () => {
    annotationCapability?.deleteAnnotation(
      trackedAnnotation.object.pageIndex,
      trackedAnnotation.object.id,
    )
  }

  const handleStyleClick = () => {
    ui?.togglePanel({
      id: "leftPanel",
      visibleChild: "leftPanelAnnotationStyle",
      open: true,
    })
  }

  const handleCommentClick = () => {
    ui?.togglePanel({
      id: "rightPanel",
      visibleChild: "comment",
      open: true,
    })
  }

  return (
    <div
      {...props}
      className="flex flex-row gap-1 rounded-md border border-[#cfd4da] bg-[#f8f9fa] p-1"
    >
      <Button onClick={handleDeleteClick}>
        <Icon icon="trash" className="h-5 w-5" />
      </Button>
      <Button onClick={handleCommentClick}>
        <Icon icon="comment" className="h-5 w-5" />
      </Button>
      <Button onClick={handleStyleClick}>
        <Icon icon="palette" className="h-5 w-5" />
      </Button>
    </div>
  )
}

interface TextSelectionMenuProps extends FloatingComponentProps {
  open: boolean
  scale?: number
  rotation?: Rotation
}

export const textSelectionMenuRenderer: ComponentRenderFunction<TextSelectionMenuProps> = (
  props,
  children,
) => {
  const { provides: selection } = useSelectionCapability()
  const { provides: scroll } = useScrollCapability()
  const { provides: viewport } = useViewportCapability()

  if (!props.open || !selection || !scroll || !viewport) return null

  const bounding = selection.getBoundingRects() // one per page
  const coords = menuPositionForSelection(bounding, scroll, viewport, 10, 42)
  if (!coords) return null // nothing visible yet

  return (
    <div
      style={{
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        transform: "translate(-50%, 0%)",
        zIndex: 2000,
      }}
      className="absolute rounded-md border border-[#cfd4da] bg-[#f8f9fa] p-1"
    >
      {children()}
    </div>
  )
}

type MenuCoords = { left: number; top: number } | null

function edgeVisible(
  vr: Rect,
  vp: ViewportMetrics,
  menuHeight: number,
  margin: number,
  vpGap: number,
  isTop: boolean,
) {
  if (isTop) {
    // For top position, check if there's enough space above the rect including margin
    return vr.origin.y + vpGap >= menuHeight + margin
  } else {
    // For bottom position, check if there's enough space below the rect including margin
    return (
      vr.origin.y + vpGap + vr.size.height + menuHeight + margin <= vp.scrollTop + vp.clientHeight
    )
  }
}

/**
 * Decide where to place the menu for a *multi-page* selection.
 *
 * boundingRects ··· one rect per page
 * scrollCap     ··· converts page-space → viewport-space
 * vpCap         ··· live viewport metrics
 * margin        ··· gap between rect and menu
 */
function menuPositionForSelection(
  boundingRects: { page: number; rect: Rect }[],
  scrollCap: ScrollCapability,
  vpCap: ViewportCapability,
  margin = 8,
  menuHeight = 40,
): MenuCoords {
  if (!boundingRects.length) return null

  const vp = vpCap.getMetrics()
  const vpGap = vpCap.getViewportGap()

  // Get the relevant rect(s) for positioning
  const rects =
    boundingRects.length === 1
      ? { first: boundingRects[0], last: boundingRects[0] }
      : { first: boundingRects[0], last: boundingRects[boundingRects.length - 1] }

  const firstVR = scrollCap.getRectPositionForPage(rects.first.page, rects.first.rect)
  const lastVR = scrollCap.getRectPositionForPage(rects.last.page, rects.last.rect)

  if (!firstVR || !lastVR) return null

  const bottomSpaceAvailable = edgeVisible(lastVR, vp, menuHeight, margin, vpGap, false)
  const topSpaceAvailable = edgeVisible(firstVR, vp, menuHeight, margin, vpGap, true)

  if (bottomSpaceAvailable) {
    return {
      left: lastVR.origin.x + lastVR.size.width / 2,
      top: lastVR.origin.y + lastVR.size.height + margin,
    }
  }
  if (topSpaceAvailable) {
    return {
      left: firstVR.origin.x + firstVR.size.width / 2,
      top: firstVR.origin.y - margin - menuHeight,
    }
  }
  return null
}
