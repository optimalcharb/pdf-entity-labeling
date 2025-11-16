import type { Action, Reducer } from "@embedpdf/core"
import type { PdfAnnotationObject } from "@embedpdf/models"
import type { TrackedAnnotation } from "./custom-types"
import type { AnnotationState } from "./state"

// ***ACTION CONSTANTS***
export const SET_ANNOTATIONS = "ANNOTATION/SET_ANNOTATIONS"
export const SELECT_ANNOTATION = "ANNOTATION/SELECT_ANNOTATION"
export const DESELECT_ANNOTATION = "ANNOTATION/DESELECT_ANNOTATION"
export const CREATE_ANNOTATION = "ANNOTATION/CREATE_ANNOTATION"
export const PATCH_ANNOTATION = "ANNOTATION/PATCH_ANNOTATION"
export const DELETE_ANNOTATION = "ANNOTATION/DELETE_ANNOTATION"
export const COMMIT_PENDING_CHANGES = "ANNOTATION/COMMIT"
export const PURGE_ANNOTATION = "ANNOTATION/PURGE_ANNOTATION"
export const SET_ACTIVE_TOOL_ID = "ANNOTATION/SET_ACTIVE_TOOL_ID"
export const SET_TOOL_DEFAULTS = "ANNOTATION/SET_TOOL_DEFAULTS"
export const SET_CAN_UNDO_REDO = "ANNOTATION/SET_CAN_UNDO_REDO"

// ***ACTION INTERFACES***
export interface SetAnnotationsAction extends Action {
  type: typeof SET_ANNOTATIONS
  payload: Record<number, PdfAnnotationObject[]>
}
export interface SelectAnnotationAction extends Action {
  type: typeof SELECT_ANNOTATION
  payload: { pageIndex: number; id: string }
}
export interface DeselectAnnotationAction extends Action {
  type: typeof DESELECT_ANNOTATION
}
export interface CreateAnnotationAction extends Action {
  type: typeof CREATE_ANNOTATION
  payload: { annotation: PdfAnnotationObject }
}
export interface PatchAnnotationAction extends Action {
  type: typeof PATCH_ANNOTATION
  payload: { id: string; patch: Partial<PdfAnnotationObject> }
}
export interface DeleteAnnotationAction extends Action {
  type: typeof DELETE_ANNOTATION
  payload: { id: string }
}
export interface CommitAction extends Action {
  type: typeof COMMIT_PENDING_CHANGES
}
export interface PurgeAnnotationAction extends Action {
  type: typeof PURGE_ANNOTATION
  payload: { uid: string }
}
export interface SetActiveToolIdAction extends Action {
  type: typeof SET_ACTIVE_TOOL_ID
  payload: string | null
}
export interface SetToolDefaultsAction extends Action {
  type: typeof SET_TOOL_DEFAULTS
  payload: { toolId: string; patch: Partial<PdfAnnotationObject> }
}
export interface SetCanUndoRedoAction extends Action {
  type: typeof SET_CAN_UNDO_REDO
  payload: { timelineIndex: number; timelineLength: number }
}

// ***ACTION UNION***
export type AnnotationAction =
  | SetAnnotationsAction
  | SelectAnnotationAction
  | DeselectAnnotationAction
  | CreateAnnotationAction
  | PatchAnnotationAction
  | DeleteAnnotationAction
  | CommitAction
  | PurgeAnnotationAction
  | SetActiveToolIdAction
  | SetToolDefaultsAction
  | SetCanUndoRedoAction

// ***ACTION CREATORS***
export const setAnnotations = (p: Record<number, PdfAnnotationObject[]>): SetAnnotationsAction => ({
  type: SET_ANNOTATIONS,
  payload: p,
})
export const selectAnnotation = (pageIndex: number, id: string): SelectAnnotationAction => ({
  type: SELECT_ANNOTATION,
  payload: { pageIndex, id },
})
export const deselectAnnotation = (): DeselectAnnotationAction => ({ type: DESELECT_ANNOTATION })
export const createAnnotation = (annotation: PdfAnnotationObject): CreateAnnotationAction => ({
  type: CREATE_ANNOTATION,
  payload: { annotation },
})
export const patchAnnotation = (
  id: string,
  patch: Partial<PdfAnnotationObject>,
): PatchAnnotationAction => ({ type: PATCH_ANNOTATION, payload: { id, patch } })
export const deleteAnnotation = (id: string): DeleteAnnotationAction => ({
  type: DELETE_ANNOTATION,
  payload: { id },
})
export const commitPendingChanges = (): CommitAction => ({ type: COMMIT_PENDING_CHANGES })
export const purgeAnnotation = (uid: string): PurgeAnnotationAction => ({
  type: PURGE_ANNOTATION,
  payload: { uid },
})
export const setActiveToolId = (id: string | null): SetActiveToolIdAction => ({
  type: SET_ACTIVE_TOOL_ID,
  payload: id,
})
export const setToolDefaults = (
  toolId: string,
  patch: Partial<PdfAnnotationObject>,
): SetToolDefaultsAction => ({
  type: SET_TOOL_DEFAULTS,
  payload: { toolId, patch },
})
export const setCanUndoRedo = (
  timelineIndex: number,
  timelineLength: number,
): SetCanUndoRedoAction => ({
  type: SET_CAN_UNDO_REDO,
  payload: { timelineIndex, timelineLength },
})

// ***ACTION REDUCER***
export const reducer: Reducer<AnnotationState, AnnotationAction> = (state, action) => {
  switch (action.type) {
    case SET_ANNOTATIONS: {
      const newPages = { ...state.pages }
      const newByUid = { ...state.byUid }
      for (const [pgStr, list] of Object.entries(action.payload)) {
        const pageIndex = Number(pgStr)
        const oldUidsOnPage = state.pages[pageIndex] || []
        for (const uid of oldUidsOnPage) {
          delete newByUid[uid]
        }
        const newUidsOnPage = list.map((a) => {
          const uid = a.id
          newByUid[uid] = { commitState: "synced", object: a }
          return uid
        })
        newPages[pageIndex] = newUidsOnPage
      }
      return { ...state, pages: newPages, byUid: newByUid, hasPendingChanges: false }
    }

    case SET_ACTIVE_TOOL_ID:
      return { ...state, activeToolId: action.payload }

    case SELECT_ANNOTATION:
      return { ...state, selectedUid: action.payload.id }

    case DESELECT_ANNOTATION:
      return { ...state, selectedUid: null }

    case CREATE_ANNOTATION: {
      const { annotation } = action.payload
      const pageIndex = annotation.pageIndex
      const uid = annotation.id
      return {
        ...state,
        pages: { ...state.pages, [pageIndex]: [...(state.pages[pageIndex] ?? []), uid] },
        byUid: { ...state.byUid, [uid]: { commitState: "new", object: annotation } },
        hasPendingChanges: true,
      }
    }

    case DELETE_ANNOTATION: {
      const { id: uid } = action.payload
      const annotation = state.byUid[uid]?.object
      if (!annotation) return state

      const pageIndex = annotation.pageIndex

      /* keep the object but mark it as deleted */
      return {
        ...state,
        pages: {
          ...state.pages,
          [pageIndex]: (state.pages[pageIndex] ?? []).filter((u) => u !== uid),
        },
        byUid: {
          ...state.byUid,
          [uid]: { ...state.byUid[uid], commitState: "deleted" } as TrackedAnnotation,
        },
        hasPendingChanges: true,
      }
    }

    case PATCH_ANNOTATION: {
      const { id, patch } = action.payload
      const prev = state.byUid[id]
      if (!prev) return state

      return {
        ...state,
        byUid: {
          ...state.byUid,
          [id]: {
            ...prev,
            commitState: prev.commitState === "synced" ? "dirty" : prev.commitState,
            object: { ...prev.object, ...patch },
          } as TrackedAnnotation,
        },
        hasPendingChanges: true,
      }
    }

    case COMMIT_PENDING_CHANGES: {
      const cleaned: AnnotationState["byUid"] = {}
      for (const [uid, ta] of Object.entries(state.byUid)) {
        cleaned[uid] = {
          ...ta,
          commitState:
            ta.commitState === "dirty" || ta.commitState === "new" ? "synced" : ta.commitState,
        }
      }
      return { ...state, byUid: cleaned, hasPendingChanges: false }
    }

    case PURGE_ANNOTATION: {
      const { uid } = action.payload
      const { [uid]: _gone, ...rest } = state.byUid
      return { ...state, byUid: rest }
    }

    case SET_CAN_UNDO_REDO:
      const { timelineIndex, timelineLength } = action.payload
      const canUndo = timelineIndex > -1
      const canRedo = timelineIndex < timelineLength - 1
      return { ...state, canUndo, canRedo }

    default:
      return state
  }
}
