import { CSSProperties, HTMLAttributes } from "react"
import { Annotations } from "./annotations"
import { TextMarkupPreview } from "./text-markup/preview"

type AnnotationLayerProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  pageIndex: number
  scale: number
  pageWidth: number
  pageHeight: number
  rotation: number
  style?: CSSProperties
  selectionOutlineColor?: string
}

export function AnnotationLayer({
  style,
  pageIndex,
  scale,
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
