import type { AnnotationState } from "./state"

/* ─────────── public selectors ─────────── */

/** All annotations _objects_ on a single page (order preserved). */
export const getAnnotationsByPageIndex = (s: AnnotationState, page: number) =>
  (s.pages[page] ?? []).map((uid) => s.byUid[uid])

/** Shortcut: every page → list of annotation objects. */
export const getAnnotations = (s: AnnotationState) => {
  const out: Record<number, ReturnType<typeof getAnnotationsByPageIndex>> = {}
  for (const p of Object.keys(s.pages).map(Number)) out[p] = getAnnotationsByPageIndex(s, p)
  return out
}

/** The full `TrackedAnnotation` for the current selection. */
export const getSelectedAnnotation = (s: AnnotationState) =>
  s.selectedUid ? s.byUid[s.selectedUid] : null

export const getSelectedAnnotationByPageIndex = (s: AnnotationState, pageIndex: number) => {
  if (!s.selectedUid) return null

  const pageUids = s.pages[pageIndex] ?? []

  // Check if the selected UID is on the requested page
  if (pageUids.includes(s.selectedUid)) {
    return s.byUid[s.selectedUid]
  }

  return null
}

/** Check if a given anno on a page is the current selection. */
export const isAnnotationSelected = (s: AnnotationState, id: string) => s.selectedUid === id
