import { PdfDocumentObject, PdfPageObject, Rotation } from "../models"
export declare const LOAD_DOCUMENT = "LOAD_DOCUMENT"
export declare const REFRESH_DOCUMENT = "REFRESH_DOCUMENT"
export declare const REFRESH_PAGES = "REFRESH_PAGES"
export declare const SET_DOCUMENT = "SET_DOCUMENT"
export declare const SET_DOCUMENT_ERROR = "SET_DOCUMENT_ERROR"
export declare const SET_SCALE = "SET_SCALE"
export declare const SET_ROTATION = "SET_ROTATION"
export declare const SET_PAGES = "SET_PAGES"
export declare const CORE_ACTION_TYPES: readonly [
  "LOAD_DOCUMENT",
  "REFRESH_DOCUMENT",
  "SET_DOCUMENT",
  "SET_DOCUMENT_ERROR",
  "SET_SCALE",
  "SET_ROTATION",
  "SET_PAGES",
]
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
export type CoreAction = DocumentAction
export declare const loadDocument: () => CoreAction
export declare const refreshDocument: (document: PdfDocumentObject) => CoreAction
export declare const refreshPages: (pages: number[]) => CoreAction
export declare const setDocument: (document: PdfDocumentObject) => CoreAction
export declare const setDocumentError: (error: string) => CoreAction
export declare const setScale: (scale: number) => CoreAction
export declare const setRotation: (rotation: Rotation) => CoreAction
export declare const setPages: (pages: PdfPageObject[][]) => CoreAction
