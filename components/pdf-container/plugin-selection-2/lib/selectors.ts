import { boundingRect, type Rect } from "@embedpdf/models"
import type { FormattedSelection } from "./custom-types"
import type { SelectionState } from "./state"

export function selectRectsForPage(state: SelectionState, page: number) {
  return state.rects[page] ?? []
}

export function selectBoundingRectForPage(state: SelectionState, page: number) {
  return boundingRect(selectRectsForPage(state, page))
}

export function selectRectsAndBoundingRectForPage(state: SelectionState, page: number) {
  return {
    rects: selectRectsForPage(state, page),
    boundingRect: selectBoundingRectForPage(state, page),
  }
}

export function selectBoundingRectsForAllPages(state: SelectionState) {
  const out: { page: number; rect: Rect }[] = []
  const rectMap = state.rects

  for (const key in rectMap) {
    const page = Number(key)
    const bRect = boundingRect(rectMap[page] as Rect[])
    if (bRect) out.push({ page, rect: bRect })
  }
  return out
}

export function getFormattedSelectionForPage(
  state: SelectionState,
  page: number,
): FormattedSelection | null {
  const segmentRects = state.rects[page] || []
  if (segmentRects.length === 0) return null
  const boundingRect = selectBoundingRectForPage(state, page)
  if (!boundingRect) return null
  return { pageIndex: page, rect: boundingRect, segmentRects }
}

export function getFormattedSelection(state: SelectionState) {
  const result: FormattedSelection[] = []

  // Get all pages that have rects
  const pages = Object.keys(state.rects).map(Number)

  for (const pageIndex of pages) {
    const segmentRects = state.rects[pageIndex] || []

    if (segmentRects.length === 0) continue

    // Calculate bounding rect for this page
    const boundingRect = selectBoundingRectForPage(state, pageIndex)

    if (boundingRect) {
      result.push({
        pageIndex,
        rect: boundingRect,
        segmentRects,
      })
    }
  }

  return result
}
