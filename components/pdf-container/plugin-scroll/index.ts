import { useEffect, useState } from "react"
import { jsx, jsxs } from "react/jsx-runtime"
import {
  Action,
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  EventHook,
  getPagesWithRotatedSize,
  PdfDocumentObject,
  Rect,
  Rotation,
  scalePosition,
  SET_DOCUMENT,
  SET_PAGES,
  SET_ROTATION,
  transformPosition,
  transformRect,
  useCapability,
  usePlugin,
  useRegistry,
} from "../core"
import { ViewportMetrics } from "../plugin-viewport"

// *****CUSTOM TYPES******
export interface PageLayout {
  pageNumber: number
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  rotatedWidth: number
  rotatedHeight: number
}

export interface VirtualItem {
  id: string
  x: number
  y: number
  offset: number
  width: number
  height: number
  pageLayouts: PageLayout[]
  pageNumbers: number[]
  index: number
}

export type ScrollBehavior = "instant" | "smooth" | "auto"

export enum ScrollStrategy {
  Vertical = "vertical",
  Horizontal = "horizontal",
}

export interface PageVisibilityMetrics {
  pageNumber: number
  viewportX: number
  viewportY: number
  visiblePercentage: number
  original: {
    pageX: number
    pageY: number
    visibleWidth: number
    visibleHeight: number
    scale: number
  }
  scaled: {
    pageX: number
    pageY: number
    visibleWidth: number
    visibleHeight: number
    scale: number
  }
}

export interface ScrollMetrics {
  currentPage: number
  visiblePages: number[]
  pageVisibilityMetrics: PageVisibilityMetrics[]
  renderedPageIndexes: number[]
  scrollOffset: {
    x: number
    y: number
  }
  startSpacing: number
  endSpacing: number
}

export interface PageChangePayload {
  pageNumber: number
  totalPages: number
}

export type LayoutChangePayload = Pick<ScrollState, "virtualItems" | "totalContentSize">

export interface ScrollToPageOptions {
  pageNumber: number
  pageCoordinates?: {
    x: number
    y: number
  }
  behavior?: ScrollBehavior
  center?: boolean
}

interface BaseScrollStrategyConfig {
  pageGap?: number
  viewportGap?: number
  bufferSize?: number
}

abstract class BaseScrollStrategy {
  protected pageGap: number
  protected viewportGap: number
  protected bufferSize: number

  constructor(config: BaseScrollStrategyConfig) {
    this.pageGap = config.pageGap ?? 20
    this.viewportGap = config.viewportGap ?? 20
    this.bufferSize = config.bufferSize ?? 2
  }

  abstract createVirtualItems(pdfPageObject: any[]): VirtualItem[]
  abstract getTotalContentSize(virtualItems: VirtualItem[]): {
    width: number
    height: number
  }
  abstract getScrollOffset(viewport: any): number
  abstract getClientSize(viewport: any): number

  getVisibleRange(viewport: any, virtualItems: VirtualItem[], scale: number) {
    const scrollOffset = this.getScrollOffset(viewport)
    const clientSize = this.getClientSize(viewport)
    const viewportStart = scrollOffset
    const viewportEnd = scrollOffset + clientSize
    let startIndex = 0
    while (
      startIndex < virtualItems.length &&
      (virtualItems[startIndex].offset + virtualItems[startIndex].height) * scale <= viewportStart
    ) {
      startIndex++
    }
    let endIndex = startIndex
    while (endIndex < virtualItems.length && virtualItems[endIndex].offset * scale <= viewportEnd) {
      endIndex++
    }
    return {
      start: Math.max(0, startIndex - this.bufferSize),
      end: Math.min(virtualItems.length - 1, endIndex + this.bufferSize - 1),
    }
  }

  handleScroll(viewport: any, virtualItems: VirtualItem[], scale: number) {
    const range = this.getVisibleRange(viewport, virtualItems, scale)
    const visibleItems = virtualItems.slice(range.start, range.end + 1)
    const pageVisibilityMetrics = this.calculatePageVisibility(visibleItems, viewport, scale)
    const visiblePages = pageVisibilityMetrics.map((m) => m.pageNumber)
    const renderedPageIndexes = virtualItems
      .slice(range.start, range.end + 1)
      .flatMap((item) => item.index)
    const currentPage = this.determineCurrentPage(pageVisibilityMetrics)
    const first = virtualItems[range.start]
    const last = virtualItems[range.end]
    const startSpacing = first ? first.offset * scale : 0
    const endSpacing = last
      ? (virtualItems[virtualItems.length - 1].offset + // end of content
          virtualItems[virtualItems.length - 1].height) *
          scale - // minus
        (last.offset + last.height) * scale
      : 0
    return {
      currentPage,
      visiblePages,
      pageVisibilityMetrics,
      renderedPageIndexes,
      scrollOffset: { x: viewport.scrollLeft, y: viewport.scrollTop },
      startSpacing,
      endSpacing,
    }
  }

  calculatePageVisibility(virtualItems: VirtualItem[], viewport: any, scale: number) {
    const visibilityMetrics: PageVisibilityMetrics[] = []
    virtualItems.forEach((item) => {
      item.pageLayouts.forEach((page) => {
        const itemX = item.x * scale
        const itemY = item.y * scale
        const pageX = itemX + page.x * scale
        const pageY = itemY + page.y * scale
        const pageWidth = page.rotatedWidth * scale
        const pageHeight = page.rotatedHeight * scale
        const viewportLeft = viewport.scrollLeft
        const viewportTop = viewport.scrollTop
        const viewportRight = viewportLeft + viewport.clientWidth
        const viewportBottom = viewportTop + viewport.clientHeight
        const intersectionLeft = Math.max(pageX, viewportLeft)
        const intersectionTop = Math.max(pageY, viewportTop)
        const intersectionRight = Math.min(pageX + pageWidth, viewportRight)
        const intersectionBottom = Math.min(pageY + pageHeight, viewportBottom)
        if (intersectionLeft < intersectionRight && intersectionTop < intersectionBottom) {
          const visibleWidth = intersectionRight - intersectionLeft
          const visibleHeight = intersectionBottom - intersectionTop
          const totalArea = pageWidth * pageHeight
          const visibleArea = visibleWidth * visibleHeight
          visibilityMetrics.push({
            pageNumber: page.pageNumber,
            viewportX: intersectionLeft - viewportLeft,
            viewportY: intersectionTop - viewportTop,
            visiblePercentage: (visibleArea / totalArea) * 100,
            original: {
              pageX: (intersectionLeft - pageX) / scale,
              pageY: (intersectionTop - pageY) / scale,
              visibleWidth: visibleWidth / scale,
              visibleHeight: visibleHeight / scale,
              scale: 1,
            },
            scaled: {
              pageX: intersectionLeft - pageX,
              pageY: intersectionTop - pageY,
              visibleWidth,
              visibleHeight,
              scale,
            },
          })
        }
      })
    })
    return visibilityMetrics
  }

  determineCurrentPage(visibilityMetrics: PageVisibilityMetrics[]) {
    if (visibilityMetrics.length === 0) return 1
    const maxVisibility = Math.max(...visibilityMetrics.map((m) => m.visiblePercentage))
    const mostVisiblePages = visibilityMetrics.filter((m) => m.visiblePercentage === maxVisibility)
    return mostVisiblePages.length === 1
      ? mostVisiblePages[0].pageNumber
      : mostVisiblePages.sort((a, b) => a.pageNumber - b.pageNumber)[0].pageNumber
  }

  getRectLocationForPage(
    pageNumber: number,
    virtualItems: VirtualItem[],
    totalContentSize?: { width: number; height: number },
  ) {
    const item = virtualItems.find((item2) => item2.pageNumbers.includes(pageNumber))
    if (!item) return null
    const pageLayout = item.pageLayouts.find((layout) => layout.pageNumber === pageNumber)
    if (!pageLayout) return null
    let centeringOffsetX = 0
    if (totalContentSize) {
      const maxWidth = totalContentSize.width
      if (item.width < maxWidth) {
        centeringOffsetX = (maxWidth - item.width) / 2
      }
    }
    return {
      origin: {
        x: item.x + pageLayout.x + centeringOffsetX,
        y: item.y + pageLayout.y,
      },
      size: {
        width: pageLayout.width,
        height: pageLayout.height,
      },
    }
  }

  getScrollPositionForPage(
    pageNumber: number,
    virtualItems: VirtualItem[],
    scale: number,
    rotation: Rotation,
    pageCoordinates?: { x: number; y: number },
  ) {
    const totalContentSize = this.getTotalContentSize(virtualItems)
    const pageRect = this.getRectLocationForPage(pageNumber, virtualItems, totalContentSize)
    if (!pageRect) return null
    const scaledBasePosition = scalePosition(pageRect.origin, scale)
    if (pageCoordinates) {
      const rotatedSize = transformPosition(
        {
          width: pageRect.size.width,
          height: pageRect.size.height,
        },
        {
          x: pageCoordinates.x,
          y: pageCoordinates.y,
        },
        rotation,
        scale,
      )
      return {
        x: scaledBasePosition.x + rotatedSize.x + this.viewportGap,
        y: scaledBasePosition.y + rotatedSize.y + this.viewportGap,
      }
    }
    return {
      x: scaledBasePosition.x + this.viewportGap,
      y: scaledBasePosition.y + this.viewportGap,
    }
  }

  getRectPositionForPage(
    pageNumber: number,
    virtualItems: VirtualItem[],
    scale: number,
    rotation: Rotation,
    rect: Rect,
  ) {
    const totalContentSize = this.getTotalContentSize(virtualItems)
    const pageRect = this.getRectLocationForPage(pageNumber, virtualItems, totalContentSize)
    if (!pageRect) return null
    const scaledBasePosition = scalePosition(pageRect.origin, scale)
    const rotatedSize = transformRect(
      {
        width: pageRect.size.width,
        height: pageRect.size.height,
      },
      rect,
      rotation,
      scale,
    )
    return {
      origin: {
        x: scaledBasePosition.x + rotatedSize.origin.x,
        y: scaledBasePosition.y + rotatedSize.origin.y,
      },
      size: rotatedSize.size,
    }
  }
}

class VerticalScrollStrategy extends BaseScrollStrategy {
  createVirtualItems(pdfPageObject: any[]) {
    let yOffset = 0
    return pdfPageObject.map((pagesInSpread, index) => {
      let pageX = 0
      const pageLayouts = pagesInSpread.map((page: any) => {
        const layout = {
          pageNumber: page.index + 1,
          pageIndex: page.index,
          x: pageX,
          y: 0,
          width: page.size.width,
          height: page.size.height,
          rotatedWidth: page.rotatedSize.width,
          rotatedHeight: page.rotatedSize.height,
        }
        pageX += page.rotatedSize.width + this.pageGap
        return layout
      })
      const width = pagesInSpread.reduce(
        (sum: number, page: any, i: number) =>
          sum + page.rotatedSize.width + (i < pagesInSpread.length - 1 ? this.pageGap : 0),
        0,
      )
      const height = Math.max(...pagesInSpread.map((p: any) => p.rotatedSize.height))
      const item = {
        id: `item-${index}`,
        x: 0,
        y: yOffset,
        offset: yOffset,
        width,
        height,
        pageLayouts,
        pageNumbers: pagesInSpread.map((p: any) => p.index + 1),
        index,
      }
      yOffset += height + this.pageGap
      return item
    })
  }

  getTotalContentSize(virtualItems: VirtualItem[]) {
    if (virtualItems.length === 0) return { width: 0, height: 0 }
    const maxWidth = Math.max(...virtualItems.map((item) => item.width))
    const totalHeight =
      virtualItems[virtualItems.length - 1].y + virtualItems[virtualItems.length - 1].height
    return {
      width: maxWidth,
      height: totalHeight,
    }
  }

  getScrollOffset(viewport: any) {
    return viewport.scrollTop
  }

  getClientSize(viewport: any) {
    return viewport.clientHeight
  }
}

class HorizontalScrollStrategy extends BaseScrollStrategy {
  createVirtualItems(pdfPageObject: any[]) {
    let xOffset = 0
    return pdfPageObject.map((pagesInSpread, index) => {
      let pageX = 0
      const pageLayouts = pagesInSpread.map((page: any) => {
        const layout = {
          pageNumber: page.index + 1,
          pageIndex: page.index,
          x: pageX,
          y: 0,
          width: page.size.width,
          height: page.size.height,
          rotatedWidth: page.rotatedSize.width,
          rotatedHeight: page.rotatedSize.height,
        }
        pageX += page.rotatedSize.width + this.pageGap
        return layout
      })
      const width = pagesInSpread.reduce(
        (sum: number, page: any, i: number) =>
          sum + page.rotatedSize.width + (i < pagesInSpread.length - 1 ? this.pageGap : 0),
        0,
      )
      const height = Math.max(...pagesInSpread.map((p: any) => p.rotatedSize.height))
      const item = {
        id: `item-${index}`,
        x: xOffset,
        y: 0,
        offset: xOffset,
        width,
        height,
        pageLayouts,
        pageNumbers: pagesInSpread.map((p: any) => p.index + 1),
        index,
      }
      xOffset += width + this.pageGap
      return item
    })
  }

  getTotalContentSize(virtualItems: VirtualItem[]) {
    if (virtualItems.length === 0) return { width: 0, height: 0 }
    const totalWidth =
      virtualItems[virtualItems.length - 1].x + virtualItems[virtualItems.length - 1].width
    const maxHeight = Math.max(...virtualItems.map((item) => item.height))
    return {
      width: totalWidth,
      height: maxHeight,
    }
  }

  getScrollOffset(viewport: any) {
    return viewport.scrollLeft
  }

  getClientSize(viewport: any) {
    return viewport.clientWidth
  }
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const SCROLL_PLUGIN_ID = "scroll"

// ***STATE***
export interface ScrollState extends ScrollMetrics {
  virtualItems: VirtualItem[]
  totalPages: number
  totalContentSize: {
    width: number
    height: number
  }
  desiredScrollPosition: {
    x: number
    y: number
  }
  strategy: ScrollStrategy
  pageGap: number
  scale: number
}

// ***INITIAL STATE***
const defaultScrollMetrics = {
  currentPage: 1,
  visiblePages: [],
  pageVisibilityMetrics: [],
  renderedPageIndexes: [],
  scrollOffset: { x: 0, y: 0 },
  startSpacing: 0,
  endSpacing: 0,
}

const initialState = (coreState: any, config: ScrollPluginConfig) => ({
  virtualItems: [],
  totalPages: coreState.pages.length,
  totalContentSize: { width: 0, height: 0 },
  desiredScrollPosition: { x: 0, y: 0 },
  strategy: config.strategy ?? ScrollStrategy.Vertical,
  pageGap: config.pageGap ?? 10,
  scale: coreState.scale,
  ...defaultScrollMetrics,
})

// ***ACTION CONSTANTS***
const UPDATE_SCROLL_STATE = "UPDATE_SCROLL_STATE"
const SET_DESIRED_SCROLL_POSITION = "SET_DESIRED_SCROLL_POSITION"
const UPDATE_TOTAL_PAGES = "UPDATE_TOTAL_PAGES"

// ***ACTION INTERFACES***
interface UpdateScrollStateAction extends Action {
  type: typeof UPDATE_SCROLL_STATE
  payload: Partial<ScrollState>
}

interface SetDesiredScrollPositionAction extends Action {
  type: typeof SET_DESIRED_SCROLL_POSITION
  payload: { x: number; y: number }
}

interface UpdateTotalPagesAction extends Action {
  type: typeof UPDATE_TOTAL_PAGES
  payload: number
}

// ***ACTION UNION***
export type ScrollAction =
  | UpdateScrollStateAction
  | SetDesiredScrollPositionAction
  | UpdateTotalPagesAction

// ***ACTION CREATORS***
const updateScrollState = (payload: Partial<ScrollState>): UpdateScrollStateAction => ({
  type: UPDATE_SCROLL_STATE,
  payload,
})

const setDesiredScrollPosition = (payload: {
  x: number
  y: number
}): SetDesiredScrollPositionAction => ({
  type: SET_DESIRED_SCROLL_POSITION,
  payload,
})

const updateTotalPages = (payload: number): UpdateTotalPagesAction => ({
  type: UPDATE_TOTAL_PAGES,
  payload,
})

// ***ACTION REDUCER***
const scrollReducer = (state: ScrollState, action: ScrollAction): ScrollState => {
  switch (action.type) {
    case UPDATE_TOTAL_PAGES:
      return { ...state, totalPages: action.payload }
    case UPDATE_SCROLL_STATE:
      return { ...state, ...action.payload }
    case SET_DESIRED_SCROLL_POSITION:
      return { ...state, desiredScrollPosition: action.payload }
    default:
      return state
  }
}

// ***PLUGIN CAPABILITY***
export interface ScrollCapability {
  onStateChange: EventHook<ScrollState>
  onScroll: EventHook<ScrollMetrics>
  getCurrentPage(): number
  getTotalPages(): number
  onPageChange: EventHook<PageChangePayload>
  onLayoutChange: EventHook<LayoutChangePayload>
  onLayoutReady: EventHook<boolean>
  scrollToPage(options: ScrollToPageOptions): void
  scrollToNextPage(behavior?: ScrollBehavior): void
  scrollToPreviousPage(behavior?: ScrollBehavior): void
  getMetrics(viewport?: ViewportMetrics): ScrollMetrics
  getLayout(): LayoutChangePayload
  getRectPositionForPage(page: number, rect: Rect, scale?: number, rotation?: Rotation): Rect | null
  setScrollStrategy(strategy: ScrollStrategy): void
  getPageGap(): number
}

// ***PLUGIN CONFIG***
export interface ScrollPluginConfig extends BasePluginConfig {
  strategy?: ScrollStrategy
  initialPage?: number
  bufferSize?: number
  pageGap?: number
}

// ***PLUGIN CLASS***
export class ScrollPlugin extends BasePlugin<
  ScrollPluginConfig,
  ScrollCapability,
  ScrollState,
  ScrollAction
> {
  static readonly id: string = SCROLL_PLUGIN_ID

  private config: ScrollPluginConfig
  private currentScale: number = 1
  private currentRotation: Rotation = Rotation.Degree0
  private currentPage: number = 1
  private layoutReady: boolean = false
  private layout$ = createBehaviorEmitter()
  private scroll$ = createBehaviorEmitter()
  private state$ = createBehaviorEmitter()
  private scrollerLayout$ = createBehaviorEmitter()
  private pageChange$ = createBehaviorEmitter()
  private layoutReady$ = createBehaviorEmitter()
  private viewport: any
  private strategyConfig: any
  private strategy: BaseScrollStrategy
  private initialPage?: number

  constructor(id: string, registry: any, config: ScrollPluginConfig) {
    super(id, registry)
    this.config = config
    this.currentScale = 1
    this.currentRotation = Rotation.Degree0
    this.currentPage = 1
    this.layoutReady = false
    this.layout$ = createBehaviorEmitter()
    this.scroll$ = createBehaviorEmitter()
    this.state$ = createBehaviorEmitter()
    this.scrollerLayout$ = createBehaviorEmitter()
    this.pageChange$ = createBehaviorEmitter()
    this.layoutReady$ = createBehaviorEmitter()
    const viewportPlugin = this.registry.getPlugin("viewport")
    if (viewportPlugin && viewportPlugin.provides) {
      this.viewport = viewportPlugin.provides()
    }
    this.strategyConfig = {
      pageGap: this.config?.pageGap ?? 10,
      viewportGap: this.viewport.getViewportGap(),
      bufferSize: this.config?.bufferSize ?? 2,
    }
    this.strategy =
      this.config?.strategy === ScrollStrategy.Horizontal
        ? new HorizontalScrollStrategy(this.strategyConfig)
        : new VerticalScrollStrategy(this.strategyConfig)
    this.initialPage = this.config?.initialPage
    this.currentScale = this.coreState.core.scale
    this.currentRotation = this.coreState.core.rotation
    this.viewport.onViewportChange((vp: any) => this.commitMetrics(this.computeMetrics(vp)), {
      mode: "throttle",
      wait: 100,
    })
    this.coreStore.onAction(SET_DOCUMENT, (_action: any, state: any) => {
      const totalPages = state.core.pages.length
      this.dispatch(updateTotalPages(totalPages))
      this.pageChange$.emit({ pageNumber: this.currentPage, totalPages })
      this.refreshAll(getPagesWithRotatedSize(state.core), this.viewport.getMetrics())
    })
    this.coreStore.onAction(SET_ROTATION, (_action: any, state: any) =>
      this.refreshAll(getPagesWithRotatedSize(state.core), this.viewport.getMetrics()),
    )
    this.coreStore.onAction(SET_PAGES, (_action: any, state: any) =>
      this.refreshAll(getPagesWithRotatedSize(state.core), this.viewport.getMetrics()),
    )
  }

  /* ------------------------------------------------------------------ */
  /*  ᴄᴏᴍᴘᴜᴛᴇʀs                                                       */
  /* ------------------------------------------------------------------ */
  computeLayout(pages: any) {
    const virtualItems = this.strategy.createVirtualItems(pages)
    const totalContentSize = this.strategy.getTotalContentSize(virtualItems)
    return { virtualItems, totalContentSize }
  }

  computeMetrics(vp: any, items: VirtualItem[] = this.state.virtualItems) {
    return this.strategy.handleScroll(vp, items, this.currentScale)
  }

  /* ------------------------------------------------------------------ */
  /*  ᴄᴏᴍᴍɪᴛ  (single source of truth)                                  */
  /* ------------------------------------------------------------------ */
  commit(stateDelta: any, emit?: any) {
    this.dispatch(updateScrollState(stateDelta))
    if (emit?.layout) this.layout$.emit(emit.layout)
    if (emit?.metrics) {
      this.scroll$.emit(emit.metrics)
      if (emit.metrics.currentPage !== this.currentPage) {
        this.currentPage = emit.metrics.currentPage
        this.pageChange$.emit({
          pageNumber: this.currentPage,
          totalPages: this.state.totalPages,
        })
      }
    }
    this.scrollerLayout$.emit(this.getScrollerLayout())
  }

  /* convenience wrappers */
  commitMetrics(metrics: any) {
    this.commit(metrics, { metrics })
  }

  /* full re-compute after page-spread or initialisation */
  refreshAll(pages: any, vp: any) {
    const layout = this.computeLayout(pages)
    const metrics = this.computeMetrics(vp, layout.virtualItems)
    this.commit({ ...layout, ...metrics }, { layout, metrics })
  }

  getVirtualItemsFromState() {
    return this.state.virtualItems || []
  }

  onScrollerData(callback: any) {
    return this.scrollerLayout$.on(callback)
  }

  getScrollerLayout() {
    const scale = this.coreState.core.scale
    return getScrollerLayout(this.state, scale)
  }

  pushScrollLayout() {
    this.scrollerLayout$.emit(this.getScrollerLayout())
  }

  onStoreUpdated(_prevState: ScrollState, _newState: ScrollState) {
    this.pushScrollLayout()
  }

  onCoreStoreUpdated(prevState: any, newState: any) {
    if (prevState.core.scale !== newState.core.scale) {
      this.currentScale = newState.core.scale
      this.commitMetrics(this.computeMetrics(this.viewport.getMetrics()))
    }
    if (prevState.core.rotation !== newState.core.rotation) {
      this.currentRotation = newState.core.rotation
    }
  }

  /**
   * Change the scroll strategy at runtime (e.g., vertical <-> horizontal)
   * @param newStrategy ScrollStrategy.Horizontal or ScrollStrategy.Vertical
   */
  setScrollStrategy(newStrategy: ScrollStrategy) {
    if (
      (newStrategy === ScrollStrategy.Horizontal &&
        this.strategy instanceof HorizontalScrollStrategy) ||
      (newStrategy === ScrollStrategy.Vertical && this.strategy instanceof VerticalScrollStrategy)
    ) {
      return
    }
    this.strategy =
      newStrategy === ScrollStrategy.Horizontal
        ? new HorizontalScrollStrategy(this.strategyConfig)
        : new VerticalScrollStrategy(this.strategyConfig)
    this.dispatch(
      updateScrollState({
        strategy: newStrategy,
      }),
    )
    const pages = getPagesWithRotatedSize(this.coreState.core)
    this.refreshAll(pages, this.viewport.getMetrics())
  }

  setLayoutReady() {
    if (this.layoutReady) return
    this.layoutReady = true
    this.layoutReady$.emit(true)
    if (this.initialPage) {
      this.scrollToPage({ pageNumber: this.initialPage, behavior: "instant" })
    }
  }

  buildCapability(): ScrollCapability {
    return {
      onStateChange: this.state$.on,
      onLayoutChange: this.layout$.on,
      onScroll: this.scroll$.on,
      onPageChange: this.pageChange$.on,
      onLayoutReady: this.layoutReady$.on,
      getCurrentPage: () => this.currentPage,
      getTotalPages: () => this.state.totalPages,
      scrollToPage: this.scrollToPage.bind(this),
      scrollToNextPage: this.scrollToNextPage.bind(this),
      scrollToPreviousPage: this.scrollToPreviousPage.bind(this),
      getMetrics: this.getMetrics.bind(this),
      getLayout: this.getLayout.bind(this),
      getRectPositionForPage: this.getRectPositionForPage.bind(this),
      getPageGap: () => this.state.pageGap,
      setScrollStrategy: (strategy: ScrollStrategy) => this.setScrollStrategy(strategy),
    }
  }

  scrollToPage(options: ScrollToPageOptions) {
    const { pageNumber, behavior = "smooth", pageCoordinates, center = false } = options
    const virtualItems = this.getVirtualItemsFromState()
    const position = this.strategy.getScrollPositionForPage(
      pageNumber,
      virtualItems,
      this.currentScale,
      this.currentRotation,
      pageCoordinates,
    )
    if (position) {
      this.viewport.scrollTo({ ...position, behavior, center })
    }
  }

  scrollToNextPage(behavior = "smooth") {
    const virtualItems = this.getVirtualItemsFromState()
    const currentItemIndex = virtualItems.findIndex((item) =>
      item.pageNumbers.includes(this.currentPage),
    )
    if (currentItemIndex >= 0 && currentItemIndex < virtualItems.length - 1) {
      const nextItem = virtualItems[currentItemIndex + 1]
      const position = this.strategy.getScrollPositionForPage(
        nextItem.pageNumbers[0],
        virtualItems,
        this.currentScale,
        this.currentRotation,
      )
      if (position) {
        this.viewport.scrollTo({ ...position, behavior })
      }
    }
  }

  scrollToPreviousPage(behavior = "smooth") {
    const virtualItems = this.getVirtualItemsFromState()
    const currentItemIndex = virtualItems.findIndex((item) =>
      item.pageNumbers.includes(this.currentPage),
    )
    if (currentItemIndex > 0) {
      const prevItem = virtualItems[currentItemIndex - 1]
      const position = this.strategy.getScrollPositionForPage(
        prevItem.pageNumbers[0],
        virtualItems,
        this.currentScale,
        this.currentRotation,
      )
      if (position) {
        this.viewport.scrollTo({ ...position, behavior })
      }
    }
  }

  getMetrics(viewport?: any) {
    const metrics = viewport || this.viewport.getMetrics()
    const virtualItems = this.getVirtualItemsFromState()
    return this.strategy.handleScroll(metrics, virtualItems, this.currentScale)
  }

  getLayout() {
    return {
      virtualItems: this.state.virtualItems,
      totalContentSize: this.state.totalContentSize,
    }
  }

  getRectPositionForPage(pageIndex: number, rect: Rect, scale?: number, rotation?: Rotation) {
    return this.strategy.getRectPositionForPage(
      pageIndex + 1,
      this.state.virtualItems,
      scale ?? this.currentScale,
      rotation ?? this.currentRotation,
      rect,
    )
  }

  async initialize() {}

  async destroy() {
    this.layout$.clear()
    this.scroll$.clear()
    this.pageChange$.clear()
    this.state$.clear()
    this.scrollerLayout$.clear()
    this.layoutReady$.clear()
    super.destroy()
  }
}

// ***MANIFEST***
const manifest = {
  id: SCROLL_PLUGIN_ID,
  name: "Scroll Plugin",
  version: "1.0.0",
  provides: ["scroll"],
  requires: ["viewport"],
  optional: [],
  defaultConfig: {
    enabled: true,
    pageGap: 10,
  },
}

// **PLUGIN PACKAGE***
export const ScrollPluginPackage = {
  manifest,
  create: (registry: any, config: ScrollPluginConfig) =>
    new ScrollPlugin(SCROLL_PLUGIN_ID, registry, config),
  reducer: scrollReducer,
  initialState: (coreState: any, config: ScrollPluginConfig) => initialState(coreState, config),
}

// ***PLUGIN HOOKS***
export const useScrollPlugin = () => usePlugin(ScrollPlugin.id)
export const useScrollCapability = () => useCapability(ScrollPlugin.id)

// *****HELPER FUNCTIONS*****
const getScrollerLayout = (state: ScrollState, scale: number) => {
  return {
    startSpacing: state.startSpacing,
    endSpacing: state.endSpacing,
    totalWidth: state.totalContentSize.width * scale,
    totalHeight: state.totalContentSize.height * scale,
    pageGap: state.pageGap * scale,
    strategy: state.strategy,
    items: state.renderedPageIndexes.map((idx) => {
      return {
        ...state.virtualItems[idx],
        pageLayouts: state.virtualItems[idx].pageLayouts.map((layout) => {
          return {
            ...layout,
            rotatedWidth: layout.rotatedWidth * scale,
            rotatedHeight: layout.rotatedHeight * scale,
            width: layout.width * scale,
            height: layout.height * scale,
          }
        }),
      }
    }),
  }
}

// *****COMPONENTS******
interface RenderPageProps extends PageLayout {
  rotation: Rotation
  scale: number
  document: PdfDocumentObject | null
}

interface ScrollerProps {
  renderPage: (props: RenderPageProps) => any
  overlayElements?: any[]
  [key: string]: any
}

export function Scroller({ renderPage, overlayElements, ...props }: ScrollerProps) {
  const { plugin: scrollPlugin } = useScrollPlugin()
  const { registry } = useRegistry()
  const [scrollerLayout, setScrollerLayout] = useState<any>(
    () => (scrollPlugin as any)?.getScrollerLayout?.() ?? null,
  )

  useEffect(() => {
    if (!scrollPlugin) return
    return (scrollPlugin as any).onScrollerData(setScrollerLayout)
  }, [scrollPlugin])

  useEffect(() => {
    if (!scrollPlugin) return
    ;(scrollPlugin as any).setLayoutReady()
  }, [scrollPlugin])

  if (!scrollerLayout) return null
  if (!registry) return null
  const coreState = registry.getStore().getState()

  return /* @__PURE__ */ jsxs("div", {
    ...props,
    style: {
      width: `${scrollerLayout.totalWidth}px`,
      height: `${scrollerLayout.totalHeight}px`,
      position: "relative",
      boxSizing: "border-box",
      margin: "0 auto",
      ...(scrollerLayout.strategy === ScrollStrategy.Horizontal && {
        display: "flex",
        flexDirection: "row",
      }),
    },
    children: [
      /* @__PURE__ */ jsx("div", {
        style: {
          ...(scrollerLayout.strategy === ScrollStrategy.Horizontal
            ? {
                width: scrollerLayout.startSpacing,
                height: "100%",
                flexShrink: 0,
              }
            : {
                height: scrollerLayout.startSpacing,
                width: "100%",
              }),
        },
      }),
      /* @__PURE__ */ jsx("div", {
        style: {
          gap: scrollerLayout.pageGap,
          display: "flex",
          alignItems: "center",
          position: "relative",
          boxSizing: "border-box",
          ...(scrollerLayout.strategy === ScrollStrategy.Horizontal
            ? {
                flexDirection: "row",
                minHeight: "100%",
              }
            : {
                flexDirection: "column",
                minWidth: "fit-content",
              }),
        },
        children: scrollerLayout.items.map((item: any) =>
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "center",
                gap: scrollerLayout.pageGap,
              },
              children: item.pageLayouts.map((layout: any) =>
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: {
                      width: `${layout.rotatedWidth}px`,
                      height: `${layout.rotatedHeight}px`,
                    },
                    children: renderPage({
                      ...layout,
                      rotation: coreState.core.rotation,
                      scale: coreState.core.scale,
                      document: coreState.core.document,
                    }),
                  },
                  layout.pageNumber,
                ),
              ),
            },
            item.pageNumbers[0],
          ),
        ),
      }),
      /* @__PURE__ */ jsx("div", {
        style: {
          ...(scrollerLayout.strategy === ScrollStrategy.Horizontal
            ? {
                width: scrollerLayout.endSpacing,
                height: "100%",
                flexShrink: 0,
              }
            : {
                height: scrollerLayout.endSpacing,
                width: "100%",
              }),
        },
      }),
      overlayElements,
    ],
  })
}

// *****CUSTOM HOOKS*****
export const useScroll = () => {
  const { provides } = useScrollCapability()
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!provides) return
    return (provides as any).onPageChange(({ pageNumber, totalPages: totalPages2 }: any) => {
      setCurrentPage(pageNumber)
      setTotalPages(totalPages2)
    })
  }, [provides])

  return {
    // New format (preferred)
    provides,
    state: {
      currentPage,
      totalPages,
    },
    // Deprecated properties with getters that show warnings
    get currentPage() {
      console.warn(
        `Accessing 'currentPage' directly on useScroll() is deprecated. Use useScroll().state.currentPage instead.`,
      )
      return currentPage
    },
    get totalPages() {
      console.warn(
        `Accessing 'totalPages' directly on useScroll() is deprecated. Use useScroll().state.totalPages instead.`,
      )
      return totalPages
    },
    get scrollToPage() {
      if ((provides as any)?.scrollToPage) {
        console.warn(
          `Accessing 'scrollToPage' directly on useScroll() is deprecated. Use useScroll().provides.scrollToPage instead.`,
        )
      }
      return (provides as any)?.scrollToPage
    },
    get scrollToNextPage() {
      if ((provides as any)?.scrollToNextPage) {
        console.warn(
          `Accessing 'scrollToNextPage' directly on useScroll() is deprecated. Use useScroll().provides.scrollToNextPage instead.`,
        )
      }
      return (provides as any)?.scrollToNextPage
    },
    get scrollToPreviousPage() {
      if ((provides as any)?.scrollToPreviousPage) {
        console.warn(
          `Accessing 'scrollToPreviousPage' directly on useScroll() is deprecated. Use useScroll().provides.scrollToPreviousPage instead.`,
        )
      }
      return (provides as any)?.scrollToPreviousPage
    },
    get getMetrics() {
      if ((provides as any)?.getMetrics) {
        console.warn(
          `Accessing 'getMetrics' directly on useScroll() is deprecated. Use useScroll().provides.getMetrics instead.`,
        )
      }
      return (provides as any)?.getMetrics
    },
    get onPageChange() {
      if ((provides as any)?.onPageChange) {
        console.warn(
          `Accessing 'onPageChange' directly on useScroll() is deprecated. Use useScroll().provides.onPageChange instead.`,
        )
      }
      return (provides as any)?.onPageChange
    },
    get onScroll() {
      if ((provides as any)?.onScroll) {
        console.warn(
          `Accessing 'onScroll' directly on useScroll() is deprecated. Use useScroll().provides.onScroll instead.`,
        )
      }
      return (provides as any)?.onScroll
    },
    get onLayoutChange() {
      if ((provides as any)?.onLayoutChange) {
        console.warn(
          `Accessing 'onLayoutChange' directly on useScroll() is deprecated. Use useScroll().provides.onLayoutChange instead.`,
        )
      }
      return (provides as any)?.onLayoutChange
    },
    get getCurrentPage() {
      if ((provides as any)?.getCurrentPage) {
        console.warn(
          `Accessing 'getCurrentPage' directly on useScroll() is deprecated. Use useScroll().provides.getCurrentPage instead.`,
        )
      }
      return (provides as any)?.getCurrentPage
    },
    get getTotalPages() {
      if ((provides as any)?.getTotalPages) {
        console.warn(
          `Accessing 'getTotalPages' directly on useScroll() is deprecated. Use useScroll().provides.getTotalPages instead.`,
        )
      }
      return (provides as any)?.getTotalPages
    },
  }
}
