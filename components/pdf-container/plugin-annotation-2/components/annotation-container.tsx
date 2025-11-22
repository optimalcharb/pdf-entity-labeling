import { PdfAnnotationObject } from "@embedpdf/models"
import { CounterRotate, useDoublePressProps } from "@embedpdf/utils/react"
import { CSSProperties, JSX, useEffect, useState } from "react"
import { TrackedAnnotation } from "../lib/custom-types"
import { SelectionMenuProps } from "./selection-menu"

interface AnnotationContainterProps<T extends PdfAnnotationObject> {
  scale: number
  rotation: number
  pageIndex: number
  pageWidth: number
  pageHeight: number
  trackedAnnotation: TrackedAnnotation<T>
  children: JSX.Element | ((annotation: T) => JSX.Element)
  isSelected: boolean
  style?: CSSProperties
  selectionMenu?: (props: SelectionMenuProps) => JSX.Element
  onDoubleClick?: (event: any) => void // previously used MouseEvent type from preact, need to import proper mouse event type
  zIndex?: number
  selectionOutlineColor?: string
  selectionOutlineWidth?: number
  selectionOutlineOffset?: number
}

export function AnnotationContainter<T extends PdfAnnotationObject>({
  scale,
  rotation,
  pageIndex,
  pageWidth,
  pageHeight,
  trackedAnnotation,
  children,
  isSelected,
  style = {},
  selectionMenu,
  onDoubleClick,
  zIndex = 1,
  selectionOutlineColor = "#007ACC",
  selectionOutlineWidth = 2,
  selectionOutlineOffset = 1,
  ...props
}: AnnotationContainterProps<T>): JSX.Element {
  const [preview, setPreview] = useState<T>(trackedAnnotation.object)
  const currentObject = preview
    ? { ...trackedAnnotation.object, ...preview }
    : trackedAnnotation.object

  const doubleProps = useDoublePressProps(onDoubleClick)

  useEffect(() => {
    setPreview(trackedAnnotation.object)
  }, [trackedAnnotation.object])

  return (
    <div data-no-interaction>
      <div
        {...doubleProps}
        style={{
          position: "absolute",
          left: currentObject.rect.origin.x * scale,
          top: currentObject.rect.origin.y * scale,
          width: currentObject.rect.size.width * scale,
          height: currentObject.rect.size.height * scale,
          outline: isSelected
            ? `${selectionOutlineWidth}px solid ${selectionOutlineColor}`
            : "none",
          outlineOffset: isSelected ? `${selectionOutlineOffset}px` : "0px",
          pointerEvents: isSelected ? "auto" : "none",
          touchAction: "none",
          cursor: "default",
          zIndex,
          ...style,
        }}
        {...props}
      >
        {(() => {
          const childrenRender = typeof children === "function" ? children(currentObject) : children
          return childrenRender
        })()}
      </div>
      <CounterRotate
        rect={{
          origin: {
            x: currentObject.rect.origin.x * scale,
            y: currentObject.rect.origin.y * scale,
          },
          size: {
            width: currentObject.rect.size.width * scale,
            height: currentObject.rect.size.height * scale,
          },
        }}
        rotation={rotation}
      >
        {({ rect, menuWrapperProps }) =>
          selectionMenu &&
          selectionMenu({
            annotation: trackedAnnotation,
            selected: isSelected,
            rect,
            menuWrapperProps,
          })
        }
      </CounterRotate>
    </div>
  )
}
