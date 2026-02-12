import type { Action, Reducer } from "@embedpdf/core"
// import { PdfAnnotationSubtype } from "@embedpdf/models"
import type { PdfTextMarkupAnnotationObject } from "./pdf-text-markup-annotation-object"
import type { AnnotationState, AnnotationDocumentState } from "./state"
// import { isValidActiveSubtype } from "./subtype-predicates"
import { Subtype } from "./state"

// ***ACTION CONSTANTS***
export const INIT_ANNOTATION_STATE = "ANNOTATION/INIT_STATE"
export const CLEANUP_ANNOTATION_STATE = "ANNOTATION/CLEANUP_STATE"
export const SET_ACTIVE_DOCUMENT = "ANNOTATION/SET_ACTIVE_DOCUMENT"
export const SET_ANNOTATIONS = "ANNOTATION/SET_ANNOTATIONS"
export const SELECT_ANNOTATION = "ANNOTATION/SELECT_ANNOTATION"
export const DESELECT_ANNOTATION = "ANNOTATION/DESELECT_ANNOTATION"
export const CREATE_ANNOTATION = "ANNOTATION/CREATE_ANNOTATION"
export const PATCH_ANNOTATION = "ANNOTATION/PATCH_ANNOTATION"
export const DELETE_ANNOTATION = "ANNOTATION/DELETE_ANNOTATION"
export const SET_CREATE_ANNOTATION_DEFAULTS = "ANNOTATION/SET_CREATE_ANNOTATION_DEFAULTS"
export const SET_CAN_UNDO_REDO = "ANNOTATION/SET_CAN_UNDO_REDO"
export const CLEAR_ANNOTATIONS = "ANNOTATION/CLEAR_ANNOTATIONS"

// ***ACTION INTERFACES***
export interface InitAnnotationStateAction extends Action {
  type: typeof INIT_ANNOTATION_STATE
  payload: { documentId: string; state: AnnotationDocumentState }
}
export interface CleanupAnnotationStateAction extends Action {
  type: typeof CLEANUP_ANNOTATION_STATE
  payload: { documentId: string }
}
export interface SetActiveDocumentAction extends Action {
  type: typeof SET_ACTIVE_DOCUMENT
  payload: { documentId: string }
}
export interface SetAnnotationsAction extends Action {
  type: typeof SET_ANNOTATIONS
  payload: { documentId: string; annotations: Record<number, PdfTextMarkupAnnotationObject[]> }
}
export interface SelectAnnotationAction extends Action {
  type: typeof SELECT_ANNOTATION
  payload: { id: string }
}
export interface DeselectAnnotationAction extends Action {
  type: typeof DESELECT_ANNOTATION
}
export interface CreateAnnotationAction extends Action {
  type: typeof CREATE_ANNOTATION
  payload: { documentId: string; annotation: PdfTextMarkupAnnotationObject }
}
export interface PatchAnnotationAction extends Action {
  type: typeof PATCH_ANNOTATION
  payload: { documentId: string; id: string; patch: Partial<PdfTextMarkupAnnotationObject> }
}
export interface DeleteAnnotationAction extends Action {
  type: typeof DELETE_ANNOTATION
  payload: { documentId: string; id: string }
}
export interface SetCreateAnnotationDefaultsAction extends Action {
  type: typeof SET_CREATE_ANNOTATION_DEFAULTS
  payload: {
    color?: string
    opacity?: number
    subtype?: Subtype | null
    entityType?: string
  }
}
export interface SetCanUndoRedoAction extends Action {
  type: typeof SET_CAN_UNDO_REDO
  payload: { timelineIndex: number; timelineLength: number }
}
export interface ClearAnnotationsAction extends Action {
  type: typeof CLEAR_ANNOTATIONS
  payload: { documentId: string }
}

// ***ACTION UNION***
export type AnnotationAction =
  | InitAnnotationStateAction
  | CleanupAnnotationStateAction
  | SetActiveDocumentAction
  | SetAnnotationsAction
  | SelectAnnotationAction
  | DeselectAnnotationAction
  | CreateAnnotationAction
  | PatchAnnotationAction
  | DeleteAnnotationAction
  | SetCreateAnnotationDefaultsAction
  | SetCanUndoRedoAction
  | ClearAnnotationsAction

// ***ACTION CREATORS***
export const initAnnotationState = (
  documentId: string,
  state: AnnotationDocumentState,
): InitAnnotationStateAction => ({
  type: INIT_ANNOTATION_STATE,
  payload: { documentId, state },
})
export const cleanupAnnotationState = (documentId: string): CleanupAnnotationStateAction => ({
  type: CLEANUP_ANNOTATION_STATE,
  payload: { documentId },
})
export const setActiveDocument = (documentId: string): SetActiveDocumentAction => ({
  type: SET_ACTIVE_DOCUMENT,
  payload: { documentId },
})
export const setAnnotations = (
  documentId: string,
  annotations: Record<number, PdfTextMarkupAnnotationObject[]>,
): SetAnnotationsAction => ({
  type: SET_ANNOTATIONS,
  payload: { documentId, annotations },
})
export const selectAnnotation = (id: string): SelectAnnotationAction => ({
  type: SELECT_ANNOTATION,
  payload: { id },
})
export const deselectAnnotation = (): DeselectAnnotationAction => ({ type: DESELECT_ANNOTATION })
export const createAnnotation = (
  documentId: string,
  annotation: PdfTextMarkupAnnotationObject,
): CreateAnnotationAction => ({
  type: CREATE_ANNOTATION,
  payload: { documentId, annotation },
})
export const patchAnnotation = (
  documentId: string,
  id: string,
  patch: Partial<PdfTextMarkupAnnotationObject>,
): PatchAnnotationAction => ({ type: PATCH_ANNOTATION, payload: { documentId, id, patch } })
export const deleteAnnotation = (documentId: string, id: string): DeleteAnnotationAction => ({
  type: DELETE_ANNOTATION,
  payload: { documentId, id },
})
export const setCreateAnnotationDefaults = (defaults: {
  color?: string
  opacity?: number
  subtype?: Subtype | null
  entityType?: string
}): SetCreateAnnotationDefaultsAction => ({
  type: SET_CREATE_ANNOTATION_DEFAULTS,
  payload: defaults,
})
export const setCanUndoRedo = (
  timelineIndex: number,
  timelineLength: number,
): SetCanUndoRedoAction => ({
  type: SET_CAN_UNDO_REDO,
  payload: { timelineIndex, timelineLength },
})
export const clearAnnotations = (documentId: string): ClearAnnotationsAction => ({
  type: CLEAR_ANNOTATIONS,
  payload: { documentId },
})

// ***ACTION REDUCER***
export const reducer: Reducer<AnnotationState, AnnotationAction> = (state, action) => {
  switch (action.type) {
    case INIT_ANNOTATION_STATE: {
      const { documentId, state: docState } = action.payload
      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: docState,
        },
      }
    }

    case CLEANUP_ANNOTATION_STATE: {
      const { documentId } = action.payload
      const { [documentId]: _removed, ...remainingDocs } = state.documents
      return {
        ...state,
        documents: remainingDocs,
        activeDocumentId: state.activeDocumentId === documentId ? null : state.activeDocumentId,
      }
    }

    case SET_ACTIVE_DOCUMENT: {
      const { documentId } = action.payload
      return {
        ...state,
        activeDocumentId: documentId,
      }
    }

    case SET_ANNOTATIONS: {
      const { documentId, annotations } = action.payload
      const docState = state.documents[documentId]
      if (!docState) return state

      const newByPage = { ...docState.byPage }
      const newByUid = { ...docState.byUid }
      for (const [pgStr, list] of Object.entries(annotations)) {
        const pageIndex = Number(pgStr)
        const oldUidsOnPage = docState.byPage[pageIndex] || []
        for (const uid of oldUidsOnPage) {
          delete newByUid[uid]
        }
        const newUidsOnPage = list.map((a) => {
          const uid = a.id
          newByUid[uid] = a
          return uid
        })
        newByPage[pageIndex] = newUidsOnPage
      }

      const newByEntityType: Record<string, string[]> = {}
      for (const uid in newByUid) {
        const anno = newByUid[uid]
        const et = anno?.custom?.entityType
        if (et) {
          const list = newByEntityType[et] || []
          list.push(uid)
          newByEntityType[et] = list
        }
      }

      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: {
            ...docState,
            byPage: newByPage,
            byUid: newByUid,
            byEntityType: newByEntityType,
          },
        },
      }
    }

    case SET_CREATE_ANNOTATION_DEFAULTS:
      return {
        ...state,
        activeColor: action.payload.color ?? state.activeColor,
        activeOpacity: action.payload.opacity ?? state.activeOpacity,
        activeSubtype:
          action.payload.subtype !== undefined ? action.payload.subtype : state.activeSubtype,
        activeEntityType: action.payload.entityType ?? state.activeEntityType,
      }

    case SELECT_ANNOTATION:
      return { ...state, selectedUid: action.payload.id }

    case DESELECT_ANNOTATION:
      return { ...state, selectedUid: null }

    case CREATE_ANNOTATION: {
      const { documentId, annotation } = action.payload
      const docState = state.documents[documentId]
      if (!docState) return state

      const pageIndex = annotation.pageIndex
      const uid = annotation.id
      const entityType = annotation.custom?.entityType
      const newByEntityType = { ...docState.byEntityType }
      if (entityType) {
        newByEntityType[entityType] = [...(newByEntityType[entityType] || []), uid]
      }

      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: {
            ...docState,
            byPage: { ...docState.byPage, [pageIndex]: [...(docState.byPage[pageIndex] ?? []), uid] },
            byUid: { ...docState.byUid, [uid]: annotation },
            byEntityType: newByEntityType,
          },
        },
      }
    }

    case DELETE_ANNOTATION: {
      const { documentId, id: uid } = action.payload
      const docState = state.documents[documentId]
      if (!docState) return state

      const annotation = docState.byUid[uid]
      if (!annotation) return state

      const pageIndex = annotation.pageIndex
      const entityType = annotation.custom?.entityType
      const newByEntityType = { ...docState.byEntityType }
      if (entityType && newByEntityType[entityType]) {
        newByEntityType[entityType] = newByEntityType[entityType]?.filter((u) => u !== uid) ?? []
        if (newByEntityType[entityType]?.length === 0) delete newByEntityType[entityType]
      }

      const { [uid]: _removed, ...newByUid } = docState.byUid

      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: {
            ...docState,
            byPage: {
              ...docState.byPage,
              [pageIndex]: (docState.byPage[pageIndex] ?? []).filter((u) => u !== uid),
            },
            byUid: newByUid,
            byEntityType: newByEntityType,
          },
        },
      }
    }

    case PATCH_ANNOTATION: {
      const { documentId, id, patch } = action.payload
      const docState = state.documents[documentId]
      if (!docState) return state

      const prev = docState.byUid[id]
      if (!prev) return state

      let newByEntityType = docState.byEntityType

      if ("custom" in patch) {
        const oldEntityType = prev.custom?.entityType
        const newEntityType = patch.custom?.entityType

        if (oldEntityType !== newEntityType) {
          newByEntityType = { ...docState.byEntityType }
          // Remove from old
          if (oldEntityType && newByEntityType[oldEntityType]) {
            newByEntityType[oldEntityType] =
              newByEntityType[oldEntityType]?.filter((u) => u !== id) ?? []
            if (newByEntityType[oldEntityType]?.length === 0) delete newByEntityType[oldEntityType]
          }
          // Add to new
          if (newEntityType) {
            newByEntityType[newEntityType] = [...(newByEntityType[newEntityType] || []), id]
          }
        }
      }

      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: {
            ...docState,
            byUid: {
              ...docState.byUid,
              [id]: { ...prev, ...patch },
            },
            byEntityType: newByEntityType,
          },
        },
      }
    }


    case SET_CAN_UNDO_REDO:
      const { timelineIndex, timelineLength } = action.payload
      const canUndo = timelineIndex > -1
      const canRedo = timelineIndex < timelineLength - 1
      return { ...state, canUndo, canRedo }

    case CLEAR_ANNOTATIONS: {
      const { documentId } = action.payload
      const docState = state.documents[documentId]
      if (!docState) return state

      return {
        ...state,
        selectedUid: null,
        documents: {
          ...state.documents,
          [documentId]: {
            ...docState,
            byUid: {},
            byPage: {},
            byEntityType: {},
          },
        },
      }
    }

    default:
      return state
  }
}
