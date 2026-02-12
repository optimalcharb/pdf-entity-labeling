import { CSSProperties, HTMLAttributes } from "react"
import { Annotations } from "./annotations"
import { TextMarkupPreview } from "./text-markup/preview"

type AnnotationLayerProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  documentId: string
  pageIndex: number
  style?: CSSProperties
  selectionOutlineColor?: string
}

export function AnnotationLayer({
  documentId,
  pageIndex,
  style,
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
        documentId={documentId}
        pageIndex={pageIndex}
        selectionOutlineColor={selectionOutlineColor}
        data-testid="annotations"
      />
      <TextMarkupPreview documentId={documentId} pageIndex={pageIndex} data-testid="text-markup" />
    </div>
  )
}
