import { BasePluginConfig, EventHook } from "@embedpdf/core"
import { PdfDocumentObject, PdfPageObject, Rect, Rotation, Rotation } from "@embedpdf/models"
import { ViewportMetrics } from "@embedpdf/plugin-viewport"
import { VirtualItem } from "./types/virtual-item"

export type ScrollBehavior = "instant" | "smooth" | "auto"

export interface PageChangeState {
  isChanging: boolean
  targetPage: number
  fromPage: number
  startTime: number
}

export interface PageLayout {
  pageNumber: number
  pageIndex: number
  x: number // Relative to item, in original coordinates
  y: number
  width: number
  height: number
  rotatedWidth: number
  rotatedHeight: number
}

export interface VirtualItem {
  id: string
  x: number // In original coordinates
  y: number
  offset: number
  width: number
  height: number
  pageLayouts: PageLayout[]
  pageNumbers: number[]
  index: number
}

export interface ScrollerLayout {
  startSpacing: number
  endSpacing: number
  totalWidth: number
  totalHeight: number
  pageGap: number
  strategy: ScrollState["strategy"]
  items: VirtualItem[]
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
  scrollOffset: { x: number; y: number }
  startSpacing: number
  endSpacing: number
}

export interface ScrollStrategyInterface {
  initialize(container: HTMLElement, innerDiv: HTMLElement): void
  destroy(): void
  updateLayout(viewport: ViewportMetrics, pdfPageObject: PdfPageObject[][]): void
  handleScroll(viewport: ViewportMetrics): void
  getVirtualItems(): VirtualItem[]
  scrollToPage(pageNumber: number, behavior?: ScrollBehavior): void
  calculateDimensions(pdfPageObject: PdfPageObject[][]): void
}

export type LayoutChangePayload = Pick<ScrollState, "virtualItems" | "totalContentSize">

export interface ScrollToPageOptions {
  pageNumber: number
  pageCoordinates?: { x: number; y: number }
  behavior?: ScrollBehavior
  center?: boolean
}

export interface PageChangePayload {
  pageNumber: number
  totalPages: number
}

export interface RenderPageProps extends PageLayout {
  rotation: Rotation
  scale: number
  document: PdfDocumentObject | null
}
