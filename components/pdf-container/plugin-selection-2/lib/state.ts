import { PdfPageGeometry, Rect } from "@embedpdf/models"
import type { SelectionRangeX } from "./custom-types"

// ***PLUGIN STATE***
export interface SelectionState {
  /** page → geometry cache */
  geometry: Record<number, PdfPageGeometry>
  /** current selection or null */
  rects: Record<number, Rect[]>
  selection: SelectionRangeX | null
  slices: Record<number, { start: number; count: number }>
  active: boolean
  selecting: boolean
}

// ***INITIAL STATE***
export const initialState: SelectionState = {
  geometry: {},
  rects: {},
  slices: {},
  selection: null,
  active: false,
  selecting: false,
}
