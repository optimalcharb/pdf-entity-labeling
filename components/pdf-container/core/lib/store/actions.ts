import { PdfDocumentObject, PdfPageObject, Rotation } from "../../models"

export const LOAD_DOCUMENT = "LOAD_DOCUMENT"
export const REFRESH_DOCUMENT = "REFRESH_DOCUMENT"
export const REFRESH_PAGES = "REFRESH_PAGES"
export const SET_DOCUMENT = "SET_DOCUMENT"
export const SET_DOCUMENT_ERROR = "SET_DOCUMENT_ERROR"
export const SET_SCALE = "SET_SCALE"
export const SET_ROTATION = "SET_ROTATION"
export const SET_PAGES = "SET_PAGES"

export const CORE_ACTION_TYPES = [
  LOAD_DOCUMENT,
  REFRESH_DOCUMENT,
  SET_DOCUMENT,
  SET_DOCUMENT_ERROR,
  SET_SCALE,
  SET_ROTATION,
  SET_PAGES,
] as const

// Action Type Interfaces
export interface LoadDocumentAction {
  type: typeof LOAD_DOCUMENT
}

export interface RefreshDocumentAction {
  type: typeof REFRESH_DOCUMENT
  payload: PdfDocumentObject
}

export interface RefreshPagesAction {
  type: typeof REFRESH_PAGES
  payload: number[]
}

export interface SetDocumentAction {
  type: typeof SET_DOCUMENT
  payload: PdfDocumentObject
}

export interface SetDocumentErrorAction {
  type: typeof SET_DOCUMENT_ERROR
  payload: string
}

export interface SetScaleAction {
  type: typeof SET_SCALE
  payload: number
}

export interface SetRotationAction {
  type: typeof SET_ROTATION
  payload: Rotation
}

export interface SetPagesAction {
  type: typeof SET_PAGES
  payload: PdfPageObject[][]
}

export type DocumentAction =
  | LoadDocumentAction
  | RefreshDocumentAction
  | RefreshPagesAction
  | SetDocumentAction
  | SetDocumentErrorAction
  | SetScaleAction
  | SetRotationAction
  | SetPagesAction

// Core actions
export type CoreAction = DocumentAction

export const loadDocument = (): CoreAction => ({ type: LOAD_DOCUMENT })
export const refreshDocument = (document: PdfDocumentObject): CoreAction => ({
  type: REFRESH_DOCUMENT,
  payload: document,
})
export const refreshPages = (pages: number[]): CoreAction => ({
  type: REFRESH_PAGES,
  payload: pages,
})
export const setDocument = (document: PdfDocumentObject): CoreAction => ({
  type: SET_DOCUMENT,
  payload: document,
})
export const setDocumentError = (error: string): CoreAction => ({
  type: SET_DOCUMENT_ERROR,
  payload: error,
})
export const setScale = (scale: number): CoreAction => ({ type: SET_SCALE, payload: scale })
export const setRotation = (rotation: Rotation): CoreAction => ({
  type: SET_ROTATION,
  payload: rotation,
})
export const setPages = (pages: PdfPageObject[][]): CoreAction => ({
  type: SET_PAGES,
  payload: pages,
})
