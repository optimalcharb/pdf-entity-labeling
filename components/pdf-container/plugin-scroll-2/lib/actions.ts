import { Action, Reducer, SET_SCALE, SetScaleAction } from "@embedpdf/core"
import type { PageChangeState } from "./custom-types"
import type { ScrollState } from "./state"

// ***ACTION CONSTANTS***
export const UPDATE_SCROLL_STATE = "UPDATE_SCROLL_STATE"
export const SET_DESIRED_SCROLL_POSITION = "SET_DESIRED_SCROLL_POSITION"
export const UPDATE_TOTAL_PAGES = "UPDATE_TOTAL_PAGES"
export const SET_PAGE_CHANGE_STATE = "SET_PAGE_CHANGE_STATE"

// ***ACTION INTERFACES***
export interface UpdateScrollStateAction extends Action {
  type: typeof UPDATE_SCROLL_STATE
  payload: Partial<ScrollState>
}
export interface SetDesiredScrollPositionAction extends Action {
  type: typeof SET_DESIRED_SCROLL_POSITION
  payload: { x: number; y: number }
}
export interface UpdateTotalPagesAction extends Action {
  type: typeof UPDATE_TOTAL_PAGES
  payload: number
}
export interface SetPageChangeStateAction extends Action {
  type: typeof SET_PAGE_CHANGE_STATE
  payload: PageChangeState
}

// ***ACTION TYPES***
export type ScrollAction =
  | UpdateScrollStateAction
  | SetDesiredScrollPositionAction
  | UpdateTotalPagesAction
  | SetPageChangeStateAction

// ***ACTION CREATORS***
export function updateScrollState(payload: Partial<ScrollState>): UpdateScrollStateAction {
  return { type: UPDATE_SCROLL_STATE, payload }
}
export function setDesiredScrollPosition(payload: {
  x: number
  y: number
}): SetDesiredScrollPositionAction {
  return { type: SET_DESIRED_SCROLL_POSITION, payload }
}
export function updateTotalPages(payload: number): UpdateTotalPagesAction {
  return { type: UPDATE_TOTAL_PAGES, payload }
}
export function setPageChangeState(payload: PageChangeState): SetPageChangeStateAction {
  return { type: SET_PAGE_CHANGE_STATE, payload }
}

// ***ACTION REDUCER***
export const reducer: Reducer<ScrollState, ScrollAction | SetScaleAction> = (state, action) => {
  switch (action.type) {
    case UPDATE_TOTAL_PAGES:
      return { ...state, totalPages: action.payload }
    case SET_SCALE:
      return { ...state, scale: action.payload }
    case UPDATE_SCROLL_STATE:
      return { ...state, ...action.payload }
    case SET_DESIRED_SCROLL_POSITION:
      return { ...state, desiredScrollPosition: action.payload }
    case SET_PAGE_CHANGE_STATE:
      return { ...state, pageChangeState: action.payload }
    default:
      return state
  }
}
