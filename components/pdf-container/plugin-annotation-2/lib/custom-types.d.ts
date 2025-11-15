import type { PdfAnnotationObject } from "@embedpdf/models"

export type AnnotationEvent =
  | {
      type: "create"
      annotation: PdfAnnotationObject
      pageIndex: number
      committed: boolean
    }
  | {
      type: "update"
      annotation: PdfAnnotationObject
      pageIndex: number
      patch: Partial<PdfAnnotationObject>
      committed: boolean
    }
  | { type: "delete"; annotation: PdfAnnotationObject; pageIndex: number; committed: boolean }
  | { type: "loaded"; total: number }

export type CommitState = "new" | "dirty" | "deleted" | "synced" | "ignored"

export interface TrackedAnnotation<A extends PdfAnnotationObject = PdfAnnotationObject> {
  commitState: CommitState
  object: A
}

export interface GetPageAnnotationsOptions {
  pageIndex: number
}

export interface Command {
  /** A function that applies the change. */
  execute(): void
  /** A function that reverts the change. */
  undo(): void
}
