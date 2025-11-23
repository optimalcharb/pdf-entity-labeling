import { CSSProperties, HTMLAttributes } from "react"
import { AnnotationMenu } from "./annotation-menu/annotation-menu"
import { Annotations } from "./annotations"
import type { SelectionMenu } from "./selection-menu"
import { TextMarkupPreview } from "./text-markup/preview"

type AnnotationLayerProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  pageIndex: number
  scale: number
  pageWidth: number
  pageHeight: number
  rotation: number
  selectionMenu: SelectionMenu
  style?: CSSProperties
  selectionOutlineColor?: string
}

export function AnnotationLayer({
  style,
  pageIndex,
  scale,
  selectionMenu = AnnotationMenu,
  pageWidth,
  pageHeight,
  rotation,
  selectionOutlineColor,
  ...props
}: AnnotationLayerProps) {
  return (
    <div
      style={{
        ...style,
      }}
      {...props}
    >
      <Annotations
        selectionMenu={selectionMenu}
        pageIndex={pageIndex}
        scale={scale}
        rotation={rotation}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        selectionOutlineColor={selectionOutlineColor}
        data-testid="annotations"
      />
      <TextMarkupPreview pageIndex={pageIndex} scale={scale} data-testid="text-markup" />
    </div>
  )
}
