import { BasePluginConfig } from "@embedpdf/core"
import {
  AnnotationCreateContext,
  PdfAnnotationObject,
  PdfRenderPageAnnotationOptions,
} from "@embedpdf/models"
import { AnnotationTool } from "./tools/types"

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

export interface AnnotationState {
  pages: Record<number, string[]>
  byUid: Record<string, TrackedAnnotation>
  selectedUid: string | null
  activeToolId: string | null
  tools: AnnotationTool[]
  hasPendingChanges: boolean
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

export type ImportAnnotationItem<T extends PdfAnnotationObject = PdfAnnotationObject> = {
  annotation: T
  ctx?: AnnotationCreateContext<T>
}

export interface GetPageAnnotationsOptions {
  pageIndex: number
}
