import type { PdfTextMarkupAnnotationObject } from "./pdf-text-markup-annotation-object"

export type AnnotationEvent =
  | {
      type: "create"
      annotation: PdfTextMarkupAnnotationObject
      pageIndex: number
      committed: boolean
    }
  | {
      type: "update"
      annotation: PdfTextMarkupAnnotationObject
      pageIndex: number
      patch: Partial<PdfTextMarkupAnnotationObject>
      committed: boolean
    }
  | {
      type: "delete"
      annotation: PdfTextMarkupAnnotationObject
      pageIndex: number
      committed: boolean
    }
  | { type: "loaded"; total: number }

export type CommitState = "new" | "dirty" | "deleted" | "synced" | "ignored"

export interface TrackedAnnotation<
  A extends PdfTextMarkupAnnotationObject = PdfTextMarkupAnnotationObject,
> {
  commitState: CommitState
  object: A
}

export interface Command {
  execute(): void
  undo(): void
}
