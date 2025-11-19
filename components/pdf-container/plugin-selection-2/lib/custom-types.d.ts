import { Rect } from "@embedpdf/models"

// user-selection cross-page
export interface GlyphPointer {
  page: number
  index: number // glyph index within that page
}

export interface SelectionRangeX {
  start: GlyphPointer
  end: GlyphPointer // inclusive
}

export interface FormattedSelection {
  pageIndex: number
  rect: Rect
  segmentRects: Rect[]
}

export interface SelectionRectsCallback {
  rects: Rect[]
  boundingRect: Rect | null
}

export interface RegisterSelectionOnPageOptions {
  pageIndex: number
  onRectsChange: (data: SelectionRectsCallback) => void
}
