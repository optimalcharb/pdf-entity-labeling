import { useRef } from "react"
import { createPluginRegistration } from "@embedpdf/core"
import { EmbedPDF } from "@embedpdf/core/react"
import { usePdfiumEngine } from "@embedpdf/engines/react"
import { ConsoleLogger } from "@embedpdf/models"
import { ExportPluginPackage } from "@embedpdf/plugin-export/react"
import { LoaderPluginPackage } from "@embedpdf/plugin-loader/react"
import { RenderLayer, RenderPluginPackage } from "@embedpdf/plugin-render/react"
import { Scroller, ScrollPluginPackage, ScrollStrategy } from "@embedpdf/plugin-scroll/react"
import { SearchLayer, SearchPluginPackage } from "@embedpdf/plugin-search/react"
import { ThumbnailPluginPackage } from "@embedpdf/plugin-thumbnail/react"
import { TilingLayer, TilingPluginPackage } from "@embedpdf/plugin-tiling/react"
import { Viewport, ViewportPluginPackage } from "@embedpdf/plugin-viewport/react"
import { PinchWrapper, ZoomMode, ZoomPluginPackage } from "@embedpdf/plugin-zoom/react"
import PluginStoreSync from "../plugin-store/components/plugin-store-sync"
import { Spinner } from "../shadcn-ui/spinner"
import { AnnotationLayer, AnnotationPluginPackage } from "./plugin-annotation-2"
import {
  GlobalPointerProvider,
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from "./plugin-interaction-manager-2"
import { SelectionLayer, SelectionPluginPackage } from "./plugin-selection-2"
import Toolbar from "./toolbar"

const logger = new ConsoleLogger()

interface PDFContainerProps {
  url: string
}

export default function PDFContainer({ url }: PDFContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { engine, isLoading, error } = usePdfiumEngine({
    wasmUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/engines/pdfium.wasm`,
    worker: true,
    logger: logger,
  })

  if (error) {
    console.error("Engine error:", error)
    return <div>Error: {error.message}</div>
  }

  if (isLoading || !engine) {
    return <Spinner data-testid="spinner0" />
  }

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden" ref={containerRef}>
      <div className="flex flex-1 overflow-hidden" data-testid="embedpdf">
        <EmbedPDF
          logger={logger}
          engine={engine}
          plugins={[
            // register Loader first
            createPluginRegistration(LoaderPluginPackage, {
              loadingOptions: {
                type: "url",
                pdfFile: {
                  id: "1",
                  url: url,
                },
                options: {
                  mode: "full-fetch",
                },
              },
            }),
            createPluginRegistration(ViewportPluginPackage, {
              viewportGap: 5,
            }),
            createPluginRegistration(ScrollPluginPackage, {
              strategy: ScrollStrategy.Vertical,
            }),
            createPluginRegistration(RenderPluginPackage),
            createPluginRegistration(InteractionManagerPluginPackage),
            createPluginRegistration(TilingPluginPackage, {
              tileSize: 768,
              overlapPx: 2.5,
              extraRings: 0,
            }),
            // register Thumbnail after Scroll, Render
            createPluginRegistration(ThumbnailPluginPackage, { width: 100 }),
            createPluginRegistration(SelectionPluginPackage),
            // register Annotation after InteractionManager, Seletion
            createPluginRegistration(AnnotationPluginPackage),
            // register Export after Annotation
            createPluginRegistration(ExportPluginPackage),
            // register Zoom after InteractionManager, Viewport, Scroll
            createPluginRegistration(ZoomPluginPackage, {
              defaultZoomLevel: ZoomMode.Automatic,
            }),
            // register Search after Scroll, Selection
            createPluginRegistration(SearchPluginPackage),
          ]}
        >
          {({ pluginsReady }) => {
            return (
              <GlobalPointerProvider>
                <PluginStoreSync />
                <Toolbar data-testid="annotation-toolbar" />
                <Viewport className="h-full w-full flex-1 overflow-hidden bg-gray-100 select-none">
                  {!pluginsReady && (
                    <div className="flex h-full w-full items-center justify-center">
                      <Spinner data-testid="spinner1" />
                    </div>
                  )}
                  {pluginsReady && (
                    <PinchWrapper>
                      <Scroller
                        renderPage={({ pageIndex, scale, width, height }) => (
                          <PagePointerProvider
                            pageIndex={pageIndex}
                            scale={scale}
                            pageWidth={width}
                            pageHeight={height}
                            rotation={0}
                          >
                            {/* RednerLayer must go first */}
                            <RenderLayer pageIndex={pageIndex} className="pointer-events-none" />
                            <TilingLayer
                              pageIndex={pageIndex}
                              scale={scale}
                              className="pointer-events-none"
                            />
                            <AnnotationLayer
                              pageIndex={pageIndex}
                              scale={scale}
                              pageWidth={width}
                              pageHeight={height}
                              rotation={0}
                              data-testid="annotation-layer"
                            />
                            <SearchLayer
                              pageIndex={pageIndex}
                              scale={scale}
                              highlightColor={"#FFFF00"}
                              activeHighlightColor={"#FFFF00"}
                            />
                            {/* SelectionLayer must go last */}
                            <SelectionLayer pageIndex={pageIndex} scale={scale} />
                          </PagePointerProvider>
                        )}
                      />
                    </PinchWrapper>
                  )}
                </Viewport>
              </GlobalPointerProvider>
            )
          }}
        </EmbedPDF>
      </div>
    </div>
  )
}
