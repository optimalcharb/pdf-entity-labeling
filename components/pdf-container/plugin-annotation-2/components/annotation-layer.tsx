import { CSSProperties, HTMLAttributes } from "react"
import { Annotations } from "./annotations"
import { TextMarkupPreview } from "./text-markup"
import { SelectionMenu } from "./types"

type AnnotationLayerProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  pageIndex: number
  scale: number
  pageWidth: number
  pageHeight: number
  rotation: number
  /** Customize selection menu across all annotations on this layer */
  selectionMenu?: SelectionMenu
  style?: CSSProperties
  selectionOutlineColor?: string
}

export function AnnotationLayer({
  style,
  pageIndex,
  scale,
  selectionMenu,
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
