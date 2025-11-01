"use client"

import { usePdfiumEngine } from "@embedpdf/engines/react"
import { useRef } from "react"
import { Spinner } from "../shadcn-ui/spinner"
import { AnnotationToolbar } from "./annotation-toolbar"
import {
  // ConsoleLogger,
  createPluginRegistration,
  EmbedPDF,
} from "./core"
import { AnnotationLayer, AnnotationPluginPackage } from "./plugin-annotation"
import { HistoryPluginPackage } from "./plugin-history"
import {
  GlobalPointerProvider,
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from "./plugin-interaction-manager"
import { LoaderPluginPackage } from "./plugin-loader"
import { RenderLayer, RenderPluginPackage } from "./plugin-render"
import { Scroller, ScrollPluginPackage, ScrollStrategy } from "./plugin-scroll"
// import { SearchLayer, SearchPluginPackage } from "./plugin-search"
import { SelectionLayer, SelectionPluginPackage } from "./plugin-selection"
import { TilingLayer, TilingPluginPackage } from "./plugin-tiling"
import { Viewport, ViewportPluginPackage } from "./plugin-viewport"
import { PinchWrapper, ZoomMode, ZoomPluginPackage } from "./plugin-zoom"

// const logger = new ConsoleLogger()

interface PDFContainerProps {
  url: string
}

export default function PDFContainer({ url }: PDFContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { engine, isLoading, error } = usePdfiumEngine({
    worker: true,
    // logger: logger,
  })

  if (error) {
    return <div>Error: {error.message}</div>
  }

  if (isLoading || !engine) {
    return <Spinner />
  }

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden" ref={containerRef}>
      <div className="flex flex-1 overflow-hidden">
        <EmbedPDF
          // logger={logger}
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
            createPluginRegistration(HistoryPluginPackage),
            createPluginRegistration(SelectionPluginPackage),
            // register Annotation after InteractionManager, Seletion, History
            createPluginRegistration(AnnotationPluginPackage, {
              annotationAuthor: "name",
            }),
            // register Zoom after InteractionManager, Viewport, Scroll
            createPluginRegistration(ZoomPluginPackage, {
              defaultZoomLevel: ZoomMode.Automatic,
            }),
            // createPluginRegistration(SearchPluginPackage),
          ]}
        >
          {({ pluginsReady }) => (
            <GlobalPointerProvider>
              <AnnotationToolbar />
              <Viewport className="h-full w-full flex-1 overflow-auto bg-gray-100 select-none">
                {!pluginsReady && (
                  <div className="flex h-full w-full items-center justify-center">
                    <Spinner />
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
                          />
                          {/* <SearchLayer
                            pageIndex={pageIndex}
                            scale={scale}
                            highlightColor={"#FFFF00"}
                            activeHighlightColor={"#FFFF00"}
                          /> */}
                          {/* SelectionLayer must go last */}
                          <SelectionLayer pageIndex={pageIndex} scale={scale} />
                        </PagePointerProvider>
                      )}
                    />
                  </PinchWrapper>
                )}
              </Viewport>
            </GlobalPointerProvider>
          )}
        </EmbedPDF>
      </div>
    </div>
  )
}
