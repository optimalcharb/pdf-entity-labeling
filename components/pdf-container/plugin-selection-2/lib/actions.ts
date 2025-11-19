import type { Action, Reducer } from "@embedpdf/core"
import type { PdfPageGeometry, Rect } from "@embedpdf/models"
import type { SelectionRangeX } from "./custom-types"
import { initialState, type SelectionState } from "./state"

// ***ACTION CONSTANTS***
export const CACHE_PAGE_GEOMETRY = "CACHE_PAGE_GEOMETRY"
export const SET_SELECTION = "SET_SELECTION"
export const START_SELECTION = "START_SELECTION"
export const END_SELECTION = "END_SELECTION"
export const CLEAR_SELECTION = "CLEAR_SELECTION"
export const SET_RECTS = "SET_RECTS"
export const SET_SLICES = "SET_SLICES"
export const RESET = "RESET"

// ***ACTION INTERFACES***
export interface CachePageGeometryAction extends Action {
  type: typeof CACHE_PAGE_GEOMETRY
  payload: { page: number; geo: PdfPageGeometry }
}
export interface SetSelectionAction extends Action {
  type: typeof SET_SELECTION
  payload: SelectionRangeX | null
}
export interface StartSelectionAction extends Action {
  type: typeof START_SELECTION
}
export interface EndSelectionAction extends Action {
  type: typeof END_SELECTION
}
export interface ClearSelectionAction extends Action {
  type: typeof CLEAR_SELECTION
}
export interface SetRectsAction extends Action {
  type: typeof SET_RECTS
  payload: Record<number, Rect[]>
}
export interface SetSlicesAction extends Action {
  type: typeof SET_SLICES
  payload: Record<number, { start: number; count: number }>
}
export interface ResetAction extends Action {
  type: typeof RESET
}

// ***ACTION UNION***
export type SelectionAction =
  | CachePageGeometryAction
  | SetSelectionAction
  | StartSelectionAction
  | EndSelectionAction
  | ClearSelectionAction
  | SetRectsAction
  | SetSlicesAction
  | ResetAction

// ***ACTION CREATORS***
export const cachePageGeometry = (page: number, geo: PdfPageGeometry): CachePageGeometryAction => ({
  type: CACHE_PAGE_GEOMETRY,
  payload: { page, geo },
})

export const setSelection = (sel: SelectionRangeX): SetSelectionAction => ({
  type: SET_SELECTION,
  payload: sel,
})
export const startSelection = (): StartSelectionAction => ({ type: START_SELECTION })
export const endSelection = (): EndSelectionAction => ({ type: END_SELECTION })
export const clearSelection = (): ClearSelectionAction => ({ type: CLEAR_SELECTION })
export const setRects = (allRects: Record<number, Rect[]>): SetRectsAction => ({
  type: SET_RECTS,
  payload: allRects,
})
export const setSlices = (
  slices: Record<number, { start: number; count: number }>,
): SetSlicesAction => ({ type: SET_SLICES, payload: slices })
export const reset = (): ResetAction => ({ type: RESET })

// ***ACTION REDUCER***
export const reducer: Reducer<SelectionState, SelectionAction> = (state, action) => {
  switch (action.type) {
    case CACHE_PAGE_GEOMETRY: {
      const { page, geo } = action.payload
      return { ...state, geometry: { ...state.geometry, [page]: geo } }
    }
    case SET_SELECTION:
      return { ...state, selection: action.payload, active: true }
    case START_SELECTION:
      return { ...state, selecting: true, selection: null, rects: {} }
    case END_SELECTION:
      return { ...state, selecting: false }
    case CLEAR_SELECTION:
      return { ...state, selecting: false, selection: null, rects: {}, active: false }
    case SET_RECTS:
      return { ...state, rects: action.payload }
    case SET_SLICES:
      return { ...state, slices: action.payload }
    case RESET:
      return initialState
    default:
      return state
  }
}
