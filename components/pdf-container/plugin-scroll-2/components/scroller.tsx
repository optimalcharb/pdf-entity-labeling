import { HTMLAttributes, ReactNode, useEffect, useState } from "react"
import { useRegistry } from "@embedpdf/core/react"
import { useScrollPlugin } from "../hooks"
import { ScrollStrategy } from "../lib"
import type { RenderPageProps, ScrollerLayout } from "../lib/custom-types"

type ScrollerProps = HTMLAttributes<HTMLDivElement> & {
  renderPage: (props: RenderPageProps) => ReactNode
  overlayElements?: ReactNode[]
}

export function Scroller({ renderPage, overlayElements, ...props }: ScrollerProps) {
  const { plugin: scrollPlugin } = useScrollPlugin()
  const { registry } = useRegistry()
  const [scrollerLayout, setScrollerLayout] = useState<ScrollerLayout | null>(
    () => scrollPlugin?.getScrollerLayout() ?? null,
  )

  useEffect(() => {
    if (!scrollPlugin) return

    return scrollPlugin.onScrollerData(setScrollerLayout)
  }, [scrollPlugin])

  useEffect(() => {
    if (!scrollPlugin) return

    scrollPlugin.setLayoutReady()
  }, [scrollPlugin])

  if (!scrollerLayout) return null
  if (!registry) return null

  const coreState = registry.getStore().getState()

  return (
    <div
      {...props}
      style={{
        width: `${scrollerLayout.totalWidth}px`,
        height: `${scrollerLayout.totalHeight}px`,
        position: "relative",
        boxSizing: "border-box",
        margin: "0 auto",
        ...(scrollerLayout.strategy === ScrollStrategy.Horizontal && {
          display: "flex",
          flexDirection: "row",
        }),
      }}
    >
      <div
        style={{
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
        }}
      />
      <div
        style={{
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
        }}
      >
        {scrollerLayout.items.map((item) => (
          <div
            key={item.pageNumbers[0]}
            style={{
              display: "flex",
              justifyContent: "center",
              gap: scrollerLayout.pageGap,
            }}
          >
            {item.pageLayouts.map((layout) => (
              <div
                key={layout.pageNumber}
                style={{
                  width: `${layout.rotatedWidth}px`,
                  height: `${layout.rotatedHeight}px`,
                }}
              >
                {renderPage({
                  ...layout,
                  rotation: coreState.core.rotation,
                  scale: coreState.core.scale,
                  document: coreState.core.document,
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        style={{
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
        }}
      />
      {overlayElements}
    </div>
  )
}
