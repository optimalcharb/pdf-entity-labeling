"use client"

import { useScroll } from "@embedpdf/plugin-scroll/react"
import { ThumbImg, ThumbnailsPane } from "@embedpdf/plugin-thumbnail/react"
import { ScrollArea } from "@/components/shadcn-ui/scroll-area"

const ThumbnailSidebar = () => {
  const { state, provides } = useScroll()

  return (
    <ScrollArea className="h-full w-[120px] border-l border-gray-200 bg-white">
      <div className="relative">
        <ThumbnailsPane>
          {(m) => {
            const isActive = state.currentPage === m.pageIndex + 1
            return (
              <div
                key={m.pageIndex}
                style={{
                  position: "absolute",
                  top: m.top,
                  height: m.wrapperHeight,
                }}
                onClick={() => provides?.scrollToPage({ pageNumber: m.pageIndex + 1 })}
                className="w-full cursor-pointer transition-colors hover:bg-gray-50"
              >
                <div
                  style={{
                    border: `2px solid ${isActive ? "#3b82f6" : "#d1d5db"}`,
                    width: m.width,
                    height: m.height,
                  }}
                  className="mx-auto"
                >
                  <ThumbImg meta={m} />
                </div>
                <span
                  style={{ height: m.labelHeight }}
                  className="flex items-center justify-center text-xs font-medium"
                >
                  {m.pageIndex + 1}
                </span>
              </div>
            )
          }}
        </ThumbnailsPane>
      </div>
    </ScrollArea>
  )
}

export default ThumbnailSidebar
