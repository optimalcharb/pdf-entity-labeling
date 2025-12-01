import { CSSProperties, JSX, useEffect, useState } from "react"
import { useDoublePressProps } from "../../../../hooks/mouse-events/use-double-press-props"
import type { TrackedAnnotation } from "../lib"
import type { PdfTextMarkupAnnotationObject } from "../lib/pdf-text-markup-annotation-object"
import { AnnotationMenu } from "./annotation-menu/annotation-menu"
import { CounterRotate } from "./annotation-menu/counter-rotate"

interface AnnotationContainterProps {
  scale: number
  rotation: number
  pageIndex: number
  pageWidth: number
  pageHeight: number
  trackedAnnotation: TrackedAnnotation<PdfTextMarkupAnnotationObject>
  children: JSX.Element | ((annotation: PdfTextMarkupAnnotationObject) => JSX.Element)
  isSelected: boolean
  style?: CSSProperties
  onDoubleClick?: (event: React.MouseEvent) => void
  onSelect?: (event: React.MouseEvent) => void
  zIndex?: number
  selectionOutlineColor?: string
  selectionOutlineWidth?: number
  selectionOutlineOffset?: number
}

export function AnnotationContainter({
  scale,
  rotation,
  // necessary props from Annotations, but not used explicitly in the code
  pageIndex: _pageIndex,
  pageWidth: _pageWidth,
  pageHeight: _pageHeight,
  trackedAnnotation,
  children,
  isSelected,
  style = {},
  onDoubleClick,
  onSelect,
  zIndex = 1,
  selectionOutlineColor = "#007ACC",
  selectionOutlineWidth = 2,
  selectionOutlineOffset = 1,
  ...props
}: AnnotationContainterProps): JSX.Element {
  const [preview, setPreview] = useState<PdfTextMarkupAnnotationObject>(trackedAnnotation.object)
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
        onClick={onSelect}
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
        {({ rect, menuWrapperProps }) => (
          <AnnotationMenu
            annotation={trackedAnnotation}
            selected={isSelected}
            rect={rect}
            menuWrapperProps={menuWrapperProps}
          />
        )}
      </CounterRotate>
    </div>
  )
}
