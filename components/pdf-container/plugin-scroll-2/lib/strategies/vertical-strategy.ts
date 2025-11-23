import { PdfPageObjectWithRotatedSize } from "@embedpdf/models"
import type { ViewportMetrics } from "@embedpdf/plugin-viewport"
import type { PageLayout, VirtualItem } from "../custom-types"
import { BaseScrollStrategy, ScrollStrategyConfig } from "./base-strategy"

export class VerticalScrollStrategy extends BaseScrollStrategy {
  constructor(config: ScrollStrategyConfig) {
    super(config)
  }

  createVirtualItems(pdfPageObject: PdfPageObjectWithRotatedSize[][]): VirtualItem[] {
    let yOffset = 0
    return pdfPageObject.map((pagesInSpread, index) => {
      let pageX = 0
      const pageLayouts: PageLayout[] = pagesInSpread.map((page) => {
        const layout: PageLayout = {
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
        (sum, page, i) =>
          sum + page.rotatedSize.width + (i < pagesInSpread.length - 1 ? this.pageGap : 0),
        0,
      )
      const height = Math.max(...pagesInSpread.map((p) => p.rotatedSize.height))
      const item: VirtualItem = {
        id: `item-${index}`,
        x: 0,
        y: yOffset,
        offset: yOffset,
        width,
        height,
        pageLayouts,
        pageNumbers: pagesInSpread.map((p) => p.index + 1),
        index,
      }
      yOffset += height + this.pageGap
      return item
    })
  }

  getTotalContentSize(virtualItems: VirtualItem[]): { width: number; height: number } {
    if (virtualItems.length === 0) return { width: 0, height: 0 }
    const maxWidth = Math.max(...virtualItems.map((item) => item.width))
    const totalHeight =
      virtualItems[virtualItems.length - 1].y + virtualItems[virtualItems.length - 1].height
    return {
      width: maxWidth,
      height: totalHeight,
    }
  }

  protected getScrollOffset(viewport: ViewportMetrics): number {
    return viewport.scrollTop
  }

  protected getClientSize(viewport: ViewportMetrics): number {
    return viewport.clientHeight
  }
}
