import { PdfPageObjectWithRotatedSize } from "@embedpdf/models"
import type { ViewportMetrics } from "@embedpdf/plugin-viewport"
import type { PageLayout, VirtualItem } from "../custom-types"
import { BaseScrollStrategy, ScrollStrategyConfig } from "./base-strategy"

export class HorizontalScrollStrategy extends BaseScrollStrategy {
  constructor(config: ScrollStrategyConfig) {
    super(config)
  }

  createVirtualItems(pdfPageObject: PdfPageObjectWithRotatedSize[][]): VirtualItem[] {
    let xOffset = 0
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
        x: xOffset,
        y: 0,
        offset: xOffset,
        width,
        height,
        pageLayouts,
        pageNumbers: pagesInSpread.map((p) => p.index + 1),
        index,
      }
      xOffset += width + this.pageGap
      return item
    })
  }

  getTotalContentSize(virtualItems: VirtualItem[]): { width: number; height: number } {
    if (virtualItems.length === 0) return { width: 0, height: 0 }
    const totalWidth =
      virtualItems[virtualItems.length - 1].x + virtualItems[virtualItems.length - 1].width
    const maxHeight = Math.max(...virtualItems.map((item) => item.height))
    return {
      width: totalWidth,
      height: maxHeight,
    }
  }

  protected getScrollOffset(viewport: ViewportMetrics): number {
    return viewport.scrollLeft
  }

  protected getClientSize(viewport: ViewportMetrics): number {
    return viewport.clientWidth
  }
}
