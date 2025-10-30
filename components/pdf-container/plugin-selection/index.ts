import { useEffect, useState } from "react"
import { jsx } from "react/jsx-runtime"
import {
  Action,
  BasePlugin,
  BasePluginConfig,
  boundingRect,
  createBehaviorEmitter,
  createEmitter,
  EventHook,
  ignore,
  PdfErrorCode,
  PdfPageGeometry,
  PdfTask,
  PdfTaskHelper,
  PluginManifest,
  PluginPackage,
  PluginRegistry,
  Position,
  Rect,
  Reducer,
  REFRESH_PAGES,
  SET_DOCUMENT,
  Task,
  useCapability,
  usePlugin,
} from "../core"

// *****CUSTOM TYPES******
interface GlyphPointer {
  page: number
  index: number
}

interface SelectionRangeX {
  start: GlyphPointer
  end: GlyphPointer
}

interface FormattedSelection {
  pageIndex: number
  rect: Rect
  segmentRects: Rect[]
}

interface SelectionRectsCallback {
  rects: Rect[]
  boundingRect: Rect | null
}

interface RegisterSelectionOnPageOptions {
  pageIndex: number
  onRectsChange: (data: SelectionRectsCallback) => void
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const SELECTION_PLUGIN_ID = "selection"

// ***STATE***
export interface SelectionState {
  /** page → geometry cache */
  geometry: Record<number, PdfPageGeometry>
  /** current selection or null */
  rects: Record<number, Rect[]>
  selection: SelectionRangeX | null
  slices: Record<
    number,
    {
      start: number
      count: number
    }
  >
  active: boolean
  selecting: boolean
}

// ***INITIAL STATE***
const initialState: SelectionState = {
  geometry: {},
  rects: {},
  slices: {},
  selection: null,
  active: false,
  selecting: false,
}

// ***ACTION CONSTANTS***
const CACHE_PAGE_GEOMETRY = "SELECTION/CACHE_PAGE_GEOMETRY"
const SET_SELECTION = "SELECTION/SET_SELECTION"
const START_SELECTION = "SELECTION/START_SELECTION"
const END_SELECTION = "SELECTION/END_SELECTION"
const CLEAR_SELECTION = "SELECTION/CLEAR_SELECTION"
const SET_RECTS = "SELECTION/SET_RECTS"
const SET_SLICES = "SELECTION/SET_SLICES"
const RESET = "SELECTION/RESET"

// ***ACTION INTERFACES***
interface CachePageGeometryAction extends Action {
  type: typeof CACHE_PAGE_GEOMETRY
  payload: {
    page: number
    geo: PdfPageGeometry
  }
}
interface SetSelectionAction extends Action {
  type: typeof SET_SELECTION
  payload: SelectionRangeX | null
}
interface StartSelectionAction extends Action {
  type: typeof START_SELECTION
}
interface EndSelectionAction extends Action {
  type: typeof END_SELECTION
}
interface ClearSelectionAction extends Action {
  type: typeof CLEAR_SELECTION
}
interface SetRectsAction extends Action {
  type: typeof SET_RECTS
  payload: Record<number, Rect[]>
}
interface SetSlicesAction extends Action {
  type: typeof SET_SLICES
  payload: Record<
    number,
    {
      start: number
      count: number
    }
  >
}
interface ResetAction extends Action {
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
const cachePageGeometry = (page: number, geo: PdfPageGeometry): CachePageGeometryAction => ({
  type: CACHE_PAGE_GEOMETRY,
  payload: { page, geo },
})
const setSelection = (sel: SelectionRangeX): SetSelectionAction => ({
  type: SET_SELECTION,
  payload: sel,
})
const startSelection = (): StartSelectionAction => ({ type: START_SELECTION })
const endSelection = (): EndSelectionAction => ({ type: END_SELECTION })
const clearSelection = (): ClearSelectionAction => ({ type: CLEAR_SELECTION })
const setRects = (allRects: Record<number, Rect[]>): SetRectsAction => ({
  type: SET_RECTS,
  payload: allRects,
})
const setSlices = (
  slices: Record<
    number,
    {
      start: number
      count: number
    }
  >,
): SetSlicesAction => ({ type: SET_SLICES, payload: slices })
const reset = (): ResetAction => ({ type: RESET })

// ***ACTION REDUCER***
const selectionReducer: Reducer<SelectionState, SelectionAction> = (
  state: SelectionState = initialState,
  action: SelectionAction,
): SelectionState => {
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
      return {
        ...state,
        selecting: false,
        selection: null,
        rects: {},
        active: false,
      }
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

// ***PLUGIN CAPABILITY***
export interface SelectionCapability {
  getFormattedSelection(): FormattedSelection[]
  getFormattedSelectionForPage(page: number): FormattedSelection | null
  getHighlightRectsForPage(page: number): Rect[]
  getHighlightRects(): Record<number, Rect[]>
  getBoundingRectForPage(page: number): Rect | null
  getBoundingRects(): {
    page: number
    rect: Rect
  }[]
  getSelectedText(): PdfTask<string[]>
  clear(): void
  copyToClipboard(): void
  onSelectionChange: EventHook<SelectionRangeX | null>
  onTextRetrieved: EventHook<string[]>
  onCopyToClipboard: EventHook<string>
  onBeginSelection: EventHook<{
    page: number
    index: number
  }>
  onEndSelection: EventHook<void>
  /** Tell the selection plugin that text selection should stay
        enabled while <modeId> is active.                    */
  enableForMode(modeId: string): void
  /** Quick check used by SelectionLayer during pointer events. */
  isEnabledForMode(modeId: string): boolean
  /** Get the current state of the selection plugin. */
  getState(): SelectionState
}

// ***PLUGIN CONFIG***
// uses BasePluginConfig

// ***PLUGIN CLASS***
export class SelectionPlugin extends BasePlugin<
  BasePluginConfig,
  SelectionCapability,
  SelectionState,
  SelectionAction
> {
  static readonly id: string = SELECTION_PLUGIN_ID

  /** Modes that should trigger text-selection logic */
  private enabledModes: Set<string> = new Set(["pointerMode"])
  private selecting = false
  private anchor?: GlyphPointer

  /** Page callbacks for rect updates */
  private pageCallbacks: Map<number, (data: SelectionRectsCallback) => void> = new Map()

  private readonly selChange$ = createBehaviorEmitter<SelectionRangeX | null>()
  private readonly textRetrieved$ = createBehaviorEmitter<string[]>()
  private readonly copyToClipboard$ = createEmitter<string>()
  private readonly beginSelection$ = createEmitter<{
    page: number
    index: number
  }>()
  private readonly endSelection$ = createEmitter<void>()

  private interactionManagerCapability: any

  constructor(id: string, registry: PluginRegistry) {
    super(id, registry)
    const plugin = this.registry.getPlugin("interaction-manager")
    this.interactionManagerCapability = plugin ? (plugin as { provides(): any }).provides() : null
    this.coreStore.onAction(SET_DOCUMENT, () => {
      this.dispatch(reset())
      this.notifyAllPages()
    })
    this.coreStore.onAction(REFRESH_PAGES, (action) => {
      const tasks = action.payload.map((pageIdx: number) =>
        this.getNewPageGeometryAndCache(pageIdx),
      )
      Task.all(tasks).wait(() => {
        action.payload.forEach((pageIdx: number) => {
          this.notifyPage(pageIdx)
        })
      }, ignore)
    })
  }

  async initialize() {}

  // capabilitiy functions to enable the client program to...
  buildCapability(): SelectionCapability {
    return {
      getFormattedSelection: () => getFormattedSelection(this.state),
      getFormattedSelectionForPage: (p: number) => getFormattedSelectionForPage(this.state, p),
      getHighlightRectsForPage: (p: number) => selectRectsForPage(this.state, p),
      getHighlightRects: () => this.state.rects,
      getBoundingRectForPage: (p: number) => selectBoundingRectForPage(this.state, p),
      getBoundingRects: () => selectBoundingRectsForAllPages(this.state),
      onCopyToClipboard: this.copyToClipboard$.on,
      onSelectionChange: this.selChange$.on,
      onTextRetrieved: this.textRetrieved$.on,
      onBeginSelection: this.beginSelection$.on,
      onEndSelection: this.endSelection$.on,
      clear: () => this.clearSelection(),
      getSelectedText: () => this.getSelectedText(),
      copyToClipboard: () => this.copyToClipboard(),
      enableForMode: (id: string) => this.enabledModes.add(id),
      isEnabledForMode: (id: string) => this.enabledModes.has(id),
      getState: () => this.state,
    }
  }

  registerSelectionOnPage(opts: RegisterSelectionOnPageOptions): () => void {
    if (!this.interactionManagerCapability) {
      this.logger.warn(
        "SelectionPlugin",
        "MissingDependency",
        "Interaction manager plugin not loaded, text selection disabled",
      )
      return () => {}
    }
    const { pageIndex, onRectsChange } = opts
    this.pageCallbacks.set(pageIndex, onRectsChange)
    const geoTask = this.getOrLoadGeometry(pageIndex)
    onRectsChange({
      rects: selectRectsForPage(this.state, pageIndex),
      boundingRect: selectBoundingRectForPage(this.state, pageIndex),
    })
    const handlers = {
      onPointerDown: (point: Position, _evt: unknown, modeId: string) => {
        if (!this.enabledModes.has(modeId)) return
        this.clearSelection()
        const cached = this.state.geometry[pageIndex]
        if (cached) {
          const g = glyphAt(cached, point)
          if (g !== -1) {
            this.beginSelection(pageIndex, g)
          }
        }
      },
      onPointerMove: (point: Position, _evt: unknown, modeId: string) => {
        if (!this.enabledModes.has(modeId)) return
        const cached = this.state.geometry[pageIndex]
        if (cached) {
          const g = glyphAt(cached, point)
          if (g !== -1) {
            this.interactionManagerCapability?.setCursor("selection-text", "text", 10)
          } else {
            this.interactionManagerCapability?.removeCursor("selection-text")
          }
          if (this.selecting && g !== -1) {
            this.updateSelection(pageIndex, g)
          }
        }
      },
      onPointerUp: (_point: Position, _evt: unknown, modeId: string) => {
        if (!this.enabledModes.has(modeId)) return
        this.endSelection()
      },
      onHandlerActiveEnd: (modeId: string) => {
        if (!this.enabledModes.has(modeId)) return
        this.clearSelection()
      },
    }
    const unregisterHandlers = this.interactionManagerCapability.registerAlways({
      scope: { type: "page", pageIndex },
      handlers,
    })
    return () => {
      unregisterHandlers()
      this.pageCallbacks.delete(pageIndex)
      geoTask.abort({ code: PdfErrorCode.Cancelled, message: "Cleanup" })
    }
  }

  private notifyPage(pageIndex: number): void {
    const callback = this.pageCallbacks.get(pageIndex)
    if (callback) {
      const mode = this.interactionManagerCapability?.getActiveMode()
      if (mode === "pointerMode") {
        callback({
          rects: selectRectsForPage(this.state, pageIndex),
          boundingRect: selectBoundingRectForPage(this.state, pageIndex),
        })
      } else {
        callback({ rects: [], boundingRect: null })
      }
    }
  }
  private notifyAllPages(): void {
    this.pageCallbacks.forEach((_, pageIndex) => {
      this.notifyPage(pageIndex)
    })
  }

  private getNewPageGeometryAndCache(pageIdx: number): PdfTask<PdfPageGeometry> {
    if (!this.coreState.core.document)
      return PdfTaskHelper.reject({
        code: PdfErrorCode.NotFound,
        message: "Doc Not Found",
      })
    const page = this.coreState.core.document.pages.find((p) => p.index === pageIdx)
    if (!page) {
      return PdfTaskHelper.reject({
        code: PdfErrorCode.NotFound,
        message: "Page Not Found",
      })
    }
    const task = this.engine.getPageGeometry(this.coreState.core.document, page)
    task.wait((geo: PdfPageGeometry) => {
      this.dispatch(cachePageGeometry(pageIdx, geo))
    }, ignore)
    return task
  }

  /* ── geometry cache ───────────────────────────────────── */
  private getOrLoadGeometry(pageIdx: number): PdfTask<PdfPageGeometry> {
    const cached = this.state.geometry[pageIdx]
    if (cached) return PdfTaskHelper.resolve(cached)
    return this.getNewPageGeometryAndCache(pageIdx)
  }

  /* ── selection state updates ───────────────────────────── */
  private beginSelection(page: number, index: number): void {
    this.selecting = true
    this.anchor = { page, index }
    this.dispatch(startSelection())
    this.beginSelection$.emit({ page, index })
  }
  private endSelection(): void {
    this.selecting = false
    this.anchor = void 0
    this.dispatch(endSelection())
    this.endSelection$.emit()
  }
  clearSelection(): void {
    this.selecting = false
    this.anchor = void 0
    this.dispatch(clearSelection())
    this.selChange$.emit(null)
    this.notifyAllPages()
  }
  private updateSelection(page: number, index: number): void {
    if (!this.selecting || !this.anchor) return
    const a = this.anchor
    const forward = page > a.page || (page === a.page && index >= a.index)
    const start = forward ? a : { page, index }
    const end = forward ? { page, index } : a
    const range = { start, end }
    this.dispatch(setSelection(range))
    this.updateRectsAndSlices(range)
    this.selChange$.emit(range)
    for (let p = range.start.page; p <= range.end.page; p++) {
      this.notifyPage(p)
    }
  }
  private updateRectsAndSlices(range: SelectionRangeX): void {
    const allRects: Record<number, Rect[]> = {}
    const allSlices: Record<number, { start: number; count: number }> = {}
    for (let p = range.start.page; p <= range.end.page; p++) {
      const geo = this.state.geometry[p]
      const sb = sliceBounds(range, geo, p)
      if (!sb) continue
      allRects[p] = rectsWithinSlice(geo, sb.from, sb.to)
      allSlices[p] = { start: sb.from, count: sb.to - sb.from + 1 }
    }
    this.dispatch(setRects(allRects))
    this.dispatch(setSlices(allSlices))
  }

  getSelectedText(): PdfTask<string[]> {
    if (!this.coreState.core.document || !this.state.selection) {
      return PdfTaskHelper.reject({
        code: PdfErrorCode.NotFound,
        message: "Doc Not Found or No Selection",
      })
    }
    const sel = this.state.selection
    const req: Array<{
      pageIndex: number
      charIndex: number
      charCount: number
    }> = []
    for (let p = sel.start.page; p <= sel.end.page; p++) {
      const s = this.state.slices[p]
      if (s) req.push({ pageIndex: p, charIndex: s.start, charCount: s.count })
    }
    if (req.length === 0) return PdfTaskHelper.resolve<string[]>([])
    const task = this.engine.getTextSlices(this.coreState.core.document, req)
    task.wait((text: string[]) => {
      this.textRetrieved$.emit(text)
    }, ignore)
    return task
  }

  private copyToClipboard(): void {
    const text = this.getSelectedText()
    text.wait((text2: string[]) => {
      this.copyToClipboard$.emit(text2.join("\n"))
    }, ignore)
  }
}

// ***MANIFEST***
const manifest: PluginManifest<BasePluginConfig> = {
  id: SELECTION_PLUGIN_ID,
  name: "Selection Plugin",
  version: "1.0.0",
  provides: [SELECTION_PLUGIN_ID],
  requires: ["interaction-manager"],
  optional: [],
  defaultConfig: {
    enabled: true,
  },
}

// **PLUGIN PACAKGE***
export const SelectionPluginPackage: PluginPackage<
  SelectionPlugin,
  BasePluginConfig,
  SelectionState,
  SelectionAction
> = {
  manifest,
  create: (registry: PluginRegistry) => new SelectionPlugin(SELECTION_PLUGIN_ID, registry),
  reducer: selectionReducer,
  initialState,
}

// ***PLUGIN HOOKS***
export const useSelectionCapability = () => useCapability(SELECTION_PLUGIN_ID)
export const useSelectionPlugin = () => usePlugin(SELECTION_PLUGIN_ID)

// *****HELPER FUNCTIONS*****
function selectRectsForPage(state: SelectionState, page: number): Rect[] {
  return state.rects[page] ?? []
}
function selectBoundingRectForPage(state: SelectionState, page: number): Rect | null {
  return boundingRect(selectRectsForPage(state, page))
}
function selectBoundingRectsForAllPages(state: SelectionState): {
  page: number
  rect: Rect
}[] {
  const out: { page: number; rect: Rect }[] = []
  const rectMap = state.rects
  for (const key in rectMap) {
    const page = Number(key)
    const bRect = boundingRect(rectMap[page])
    if (bRect) out.push({ page, rect: bRect })
  }
  return out
}

// function to get selection
function getFormattedSelectionForPage(
  state: SelectionState,
  page: number,
): FormattedSelection | null {
  const segmentRects = state.rects[page] || []
  if (segmentRects.length === 0) return null
  const boundingRect2 = selectBoundingRectForPage(state, page)
  if (!boundingRect2) return null
  return { pageIndex: page, rect: boundingRect2, segmentRects }
}
export function getFormattedSelection(state: SelectionState): FormattedSelection[] {
  const result: FormattedSelection[] = []
  const pages = Object.keys(state.rects).map(Number)
  for (const pageIndex of pages) {
    const segmentRects = state.rects[pageIndex] || []
    if (segmentRects.length === 0) continue
    const boundingRect2 = selectBoundingRectForPage(state, pageIndex)
    if (boundingRect2) {
      result.push({
        pageIndex,
        rect: boundingRect2,
        segmentRects,
      })
    }
  }
  return result
}

export function CopyToClipboard(): null {
  const { provides: sel } = useSelectionCapability()
  useEffect(() => {
    if (!sel || typeof sel !== "object" || !("onCopyToClipboard" in sel)) return
    return (sel as SelectionCapability).onCopyToClipboard((text: string) => {
      navigator.clipboard.writeText(text)
    })
  }, [sel])
  return null
}

function glyphAt(geo: PdfPageGeometry, pt: Position): number {
  for (const run of geo.runs) {
    const inRun =
      pt.y >= run.rect.y &&
      pt.y <= run.rect.y + run.rect.height &&
      pt.x >= run.rect.x &&
      pt.x <= run.rect.x + run.rect.width
    if (!inRun) continue
    const rel = run.glyphs.findIndex(
      (g) => pt.x >= g.x && pt.x <= g.x + g.width && pt.y >= g.y && pt.y <= g.y + g.height,
    )
    if (rel !== -1) {
      return run.charStart + rel
    }
  }
  return -1
}
function sliceBounds(
  sel: SelectionRangeX | null,
  geo: PdfPageGeometry | undefined,
  page: number,
): {
  from: number
  to: number
} | null {
  if (!sel || !geo) return null
  if (page < sel.start.page || page > sel.end.page) return null
  const from = page === sel.start.page ? sel.start.index : 0
  const lastRun = geo.runs[geo.runs.length - 1]
  const lastCharOnPage = lastRun.charStart + lastRun.glyphs.length - 1
  const to = page === sel.end.page ? sel.end.index : lastCharOnPage
  return { from, to }
}

function rectsWithinSlice(geo: PdfPageGeometry, from: number, to: number, merge = true): Rect[] {
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
      if (g.flags === 2) continue
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
  if (!merge) {
    return textRuns.map((run) => run.rect)
  }
  return mergeAdjacentRects(textRuns)
}

// ============================================================================
// Rectangle Merging Algorithm
// ============================================================================

/**
 * Text run info for rect merging (similar to Chromium's ScreenRectTextRunInfo)
 */
interface TextRunInfo {
  rect: Rect
  charCount: number
}

/**
 * Help functions for rects
 */
function rectUnion(rect1: Rect, rect2: Rect): Rect {
  const left = Math.min(rect1.origin.x, rect2.origin.x)
  const top = Math.min(rect1.origin.y, rect2.origin.y)
  const right = Math.max(rect1.origin.x + rect1.size.width, rect2.origin.x + rect2.size.width)
  const bottom = Math.max(rect1.origin.y + rect1.size.height, rect2.origin.y + rect2.size.height)
  return {
    origin: { x: left, y: top },
    size: { width: right - left, height: bottom - top },
  }
}
function rectIntersect(rect1: Rect, rect2: Rect): Rect {
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
function rectIsEmpty(rect: Rect): boolean {
  return rect.size.width <= 0 || rect.size.height <= 0
}

/**
 * Returns a ratio between [0, 1] representing vertical overlap
 */
export function getVerticalOverlap(rect1: Rect, rect2: Rect): number {
  if (rectIsEmpty(rect1) || rectIsEmpty(rect2)) return 0
  const unionRect = rectUnion(rect1, rect2)
  if (unionRect.size.height === rect1.size.height || unionRect.size.height === rect2.size.height) {
    return 1
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
  const HORIZONTAL_WIDTH_FACTOR = 1
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

// *****COMPONENTS******
// ***MAIN COMPONENT***
export function SelectionLayer({
  pageIndex,
  scale,
  background = "rgba(33,150,243)",
}: {
  pageIndex: number
  scale: number
  background?: string
}): React.JSX.Element | null {
  const { plugin: selPlugin } = useSelectionPlugin()
  const [rects, setRects] = useState<Rect[]>([])
  const [boundingRect, setBoundingRect] = useState<Rect | null>(null)
  useEffect(() => {
    if (!selPlugin || !(selPlugin instanceof SelectionPlugin)) return
    return selPlugin.registerSelectionOnPage({
      pageIndex,
      onRectsChange: ({ rects: rects2, boundingRect: boundingRect2 }: SelectionRectsCallback) => {
        setRects(rects2)
        setBoundingRect(boundingRect2)
      },
    })
  }, [selPlugin, pageIndex])
  if (!boundingRect) return null
  return jsx("div", {
    style: {
      position: "absolute",
      left: boundingRect.origin.x * scale,
      top: boundingRect.origin.y * scale,
      width: boundingRect.size.width * scale,
      height: boundingRect.size.height * scale,
      mixBlendMode: "multiply",
      isolation: "isolate",
    },
    children: rects.map((b, i) =>
      jsx(
        "div",
        {
          style: {
            position: "absolute",
            left: (b.origin.x - boundingRect.origin.x) * scale,
            top: (b.origin.y - boundingRect.origin.y) * scale,
            width: b.size.width * scale,
            height: b.size.height * scale,
            background,
            pointerEvents: "none",
          },
        },
        i,
      ),
    ),
  })
}
