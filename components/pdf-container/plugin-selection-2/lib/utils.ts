import { PdfPageGeometry, Position, Rect } from "@embedpdf/models"
import type { SelectionRangeX } from "./custom-types"

/**
 * Hit-test helper using runs
 * @param geo - page geometry
 * @param pt - point
 * @returns glyph index
 */
export function glyphAt(geo: PdfPageGeometry, pt: Position) {
  for (const run of geo.runs) {
    const inRun =
      pt.y >= run.rect.y &&
      pt.y <= run.rect.y + run.rect.height &&
      pt.x >= run.rect.x &&
      pt.x <= run.rect.x + run.rect.width

    if (!inRun) continue

    // Simply check if the point is within any glyph's bounding box
    const rel = run.glyphs.findIndex(
      (g) => pt.x >= g.x && pt.x <= g.x + g.width && pt.y >= g.y && pt.y <= g.y + g.height,
    )

    if (rel !== -1) {
      return run.charStart + rel
    }
  }
  return -1
}

/**
 * Helper: min/max glyph indices on `page` for current sel
 * @param sel - selection range
 * @param geo - page geometry
 * @param page - page index
 * @returns { from: number; to: number } | null
 */
export function sliceBounds(
  sel: SelectionRangeX | null,
  geo: PdfPageGeometry | undefined,
  page: number,
): { from: number; to: number } | null {
  if (!sel || !geo) return null
  if (page < sel.start.page || page > sel.end.page) return null

  const from = page === sel.start.page ? sel.start.index : 0

  const lastRun = geo.runs[geo.runs.length - 1]
  if (!lastRun) return null
  const lastCharOnPage = lastRun.charStart + lastRun.glyphs.length - 1

  const to = page === sel.end.page ? sel.end.index : lastCharOnPage

  return { from, to }
}

/**
 * Helper: build rects for a slice of the page
 * @param geo - page geometry
 * @param from - from index
 * @param to - to index
 * @param merge - whether to merge adjacent rects (default: true)
 * @returns rects
 */
export function rectsWithinSlice(
  geo: PdfPageGeometry,
  from: number,
  to: number,
  merge: boolean = true,
): Rect[] {
  const textRuns: TextRunInfo[] = []

  for (const run of geo.runs) {
    const runStart = run.charStart
    const runEnd = runStart + run.glyphs.length - 1
    if (runEnd < from || runStart > to) continue

    const sIdx = Math.max(from, runStart) - runStart
    const eIdx = Math.min(to, runEnd) - runStart

    let minX = Infinity,
      maxX = -Infinity
    let minY = Infinity,
      maxY = -Infinity
    let charCount = 0

    for (let i = sIdx; i <= eIdx; i++) {
      const g = run.glyphs[i]
      if (!g || g.flags === 2) continue // empty glyph

      minX = Math.min(minX, g.x)
      maxX = Math.max(maxX, g.x + g.width)
      minY = Math.min(minY, g.y)
      maxY = Math.max(maxY, g.y + g.height)
      charCount++
    }

    if (minX !== Infinity && charCount > 0) {
      textRuns.push({
        rect: {
          origin: { x: minX, y: minY },
          size: { width: maxX - minX, height: maxY - minY },
        },
        charCount,
      })
    }
  }

  // If merge is false, just return the individual rects
  if (!merge) {
    return textRuns.map((run) => run.rect)
  }

  // Otherwise merge adjacent rects
  return mergeAdjacentRects(textRuns)
}

/**
 * ============================================================================
 * Rectangle Merging Algorithm
 * ============================================================================
 *
 * The following code is adapted from Chromium's PDF text selection implementation.
 *
 * Copyright 2010 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file: https://source.chromium.org/chromium/chromium/src/+/main:LICENSE
 *
 * Original source:
 * https://source.chromium.org/chromium/chromium/src/+/main:pdf/pdfium/pdfium_range.cc
 *
 * Adapted for TypeScript and this project's Rect/geometry types.
 */

/**
 * Text run info for rect merging (similar to Chromium's ScreenRectTextRunInfo)
 */
export interface TextRunInfo {
  rect: Rect
  charCount: number
}

/**
 * Helper functions for Rect operations
 */
export function rectUnion(rect1: Rect, rect2: Rect): Rect {
  const left = Math.min(rect1.origin.x, rect2.origin.x)
  const top = Math.min(rect1.origin.y, rect2.origin.y)
  const right = Math.max(rect1.origin.x + rect1.size.width, rect2.origin.x + rect2.size.width)
  const bottom = Math.max(rect1.origin.y + rect1.size.height, rect2.origin.y + rect2.size.height)

  return {
    origin: { x: left, y: top },
    size: { width: right - left, height: bottom - top },
  }
}

export function rectIntersect(rect1: Rect, rect2: Rect): Rect {
  const left = Math.max(rect1.origin.x, rect2.origin.x)
  const top = Math.max(rect1.origin.y, rect2.origin.y)
  const right = Math.min(rect1.origin.x + rect1.size.width, rect2.origin.x + rect2.size.width)
  const bottom = Math.min(rect1.origin.y + rect1.size.height, rect2.origin.y + rect2.size.height)

  const width = Math.max(0, right - left)
  const height = Math.max(0, bottom - top)

  return {
    origin: { x: left, y: top },
    size: { width, height },
  }
}

export function rectIsEmpty(rect: Rect): boolean {
  return rect.size.width <= 0 || rect.size.height <= 0
}

/**
 * Returns a ratio between [0, 1] representing vertical overlap
 */
export function getVerticalOverlap(rect1: Rect, rect2: Rect): number {
  if (rectIsEmpty(rect1) || rectIsEmpty(rect2)) return 0

  const unionRect = rectUnion(rect1, rect2)

  if (unionRect.size.height === rect1.size.height || unionRect.size.height === rect2.size.height) {
    return 1.0
  }

  const intersectRect = rectIntersect(rect1, rect2)
  return intersectRect.size.height / unionRect.size.height
}

/**
 * Returns true if there is sufficient horizontal and vertical overlap
 */
export function shouldMergeHorizontalRects(textRun1: TextRunInfo, textRun2: TextRunInfo): boolean {
  const VERTICAL_OVERLAP_THRESHOLD = 0.8
  const rect1 = textRun1.rect
  const rect2 = textRun2.rect

  if (getVerticalOverlap(rect1, rect2) < VERTICAL_OVERLAP_THRESHOLD) {
    return false
  }

  const HORIZONTAL_WIDTH_FACTOR = 1.0
  const averageWidth1 = (HORIZONTAL_WIDTH_FACTOR * rect1.size.width) / textRun1.charCount
  const averageWidth2 = (HORIZONTAL_WIDTH_FACTOR * rect2.size.width) / textRun2.charCount

  const rect1Left = rect1.origin.x - averageWidth1
  const rect1Right = rect1.origin.x + rect1.size.width + averageWidth1
  const rect2Left = rect2.origin.x - averageWidth2
  const rect2Right = rect2.origin.x + rect2.size.width + averageWidth2

  return rect1Left < rect2Right && rect1Right > rect2Left
}

/**
 * Merge adjacent rectangles based on proximity and overlap (similar to Chromium's algorithm)
 */
export function mergeAdjacentRects(textRuns: TextRunInfo[]): Rect[] {
  const results: Rect[] = []
  let previousTextRun: TextRunInfo | null = null
  let currentRect: Rect | null = null

  for (const textRun of textRuns) {
    if (previousTextRun && currentRect) {
      if (shouldMergeHorizontalRects(previousTextRun, textRun)) {
        currentRect = rectUnion(currentRect, textRun.rect)
      } else {
        results.push(currentRect)
        currentRect = textRun.rect
      }
    } else {
      currentRect = textRun.rect
    }
    previousTextRun = textRun
  }

  if (currentRect && !rectIsEmpty(currentRect)) {
    results.push(currentRect)
  }

  return results
}
