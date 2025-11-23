import { CoreState } from "@embedpdf/core"
import type { PageChangeState, ScrollMetrics, VirtualItem } from "./custom-types"
import { ScrollPluginConfig, ScrollStrategy } from "./scroll-plugin"

export interface ScrollState extends ScrollMetrics {
  virtualItems: VirtualItem[]
  totalPages: number
  totalContentSize: { width: number; height: number }
  desiredScrollPosition: { x: number; y: number }
  strategy: ScrollStrategy
  pageGap: number
  scale: number
  pageChangeState: PageChangeState
}

const defaultScrollMetrics: ScrollMetrics = {
  currentPage: 1,
  visiblePages: [],
  pageVisibilityMetrics: [],
  renderedPageIndexes: [],
  scrollOffset: { x: 0, y: 0 },
  startSpacing: 0,
  endSpacing: 0,
}

const defaultPageChangeState: PageChangeState = {
  isChanging: false,
  targetPage: 1,
  fromPage: 1,
  startTime: 0,
}

export const initialState: (coreState: CoreState, config: ScrollPluginConfig) => ScrollState = (
  coreState,
  config,
) => ({
  virtualItems: [],
  totalPages: coreState.pages.length,
  totalContentSize: { width: 0, height: 0 },
  desiredScrollPosition: { x: 0, y: 0 },
  strategy: config.strategy ?? ScrollStrategy.Vertical,
  pageGap: config.pageGap ?? 10,
  scale: coreState.scale,
  pageChangeState: defaultPageChangeState,
  ...defaultScrollMetrics,
})
