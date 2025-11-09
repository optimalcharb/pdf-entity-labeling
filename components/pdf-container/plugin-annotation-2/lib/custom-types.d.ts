import type {
  AnnotationCreateContext,
  PdfAnnotationObject,
  PdfRenderPageAnnotationOptions,
} from "@embedpdf/models"

export type AnnotationEvent =
  | {
      type: "create"
      annotation: PdfAnnotationObject
      pageIndex: number
      ctx?: AnnotationCreateContext<any>
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

export interface TrackedAnnotation<T extends PdfAnnotationObject = PdfAnnotationObject> {
  commitState: CommitState
  object: T
}

export interface RenderAnnotationOptions {
  pageIndex: number
  annotation: PdfAnnotationObject
  options?: PdfRenderPageAnnotationOptions
}

/**
 * Options for transforming an annotation
 */
export interface TransformOptions<T extends PdfAnnotationObject = PdfAnnotationObject> {
  /** The type of transformation */
  type: "move" | "resize" | "vertex-edit" | "property-update"

  /** The changes to apply */
  changes: Partial<T>

  /** Optional metadata */
  metadata?: {
    maintainAspectRatio?: boolean
    [key: string]: any
  }
}

export interface GetPageAnnotationsOptions {
  pageIndex: number
}
