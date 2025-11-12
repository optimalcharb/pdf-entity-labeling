import { createPluginRegistration } from "@embedpdf/core"
import { EmbedPDF } from "@embedpdf/core/react"
import { usePdfiumEngine } from "@embedpdf/engines/react"
import { ConsoleLogger } from "@embedpdf/models"
import { ExportPluginPackage } from "@embedpdf/plugin-export/react"
import { HistoryPluginPackage } from "@embedpdf/plugin-history/react"
import {
  GlobalPointerProvider,
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from "@embedpdf/plugin-interaction-manager/react"
import { LoaderPluginPackage } from "@embedpdf/plugin-loader/react"
import { RenderLayer, RenderPluginPackage } from "@embedpdf/plugin-render/react"
import { Scroller, ScrollPluginPackage, ScrollStrategy } from "@embedpdf/plugin-scroll/react"
import { useRef } from "react"
import { Spinner } from "../shadcn-ui/spinner"
import { Toolbar } from "./toolbar"
import { AnnotationLayer, AnnotationPluginPackage } from "./plugin-annotation-2"
import { EntityTable } from "../entity-table"
import { EntitySelectionHandler } from "../entity-selection-dialog"
import { KeyboardNavigation } from "../keyboard-navigation"
// import { SearchLayer, SearchPluginPackage } from "@embedpdf/plugin-search/react"
import { SelectionLayer, SelectionPluginPackage } from "@embedpdf/plugin-selection/react"
import { TilingLayer, TilingPluginPackage } from "@embedpdf/plugin-tiling/react"
import { Viewport, ViewportPluginPackage } from "@embedpdf/plugin-viewport/react"
import { PinchWrapper, ZoomMode, ZoomPluginPackage } from "@embedpdf/plugin-zoom/react"

const logger = new ConsoleLogger()

interface SelectionMenuProps {
  annotation: {
    object: {
      id: string
      contents?: string
      pageIndex?: number
    }
  }
  selected: boolean
  rect: {
    x: number
    y: number
    width: number
    height: number
  }
  menuWrapperProps?: any
}

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
  const [, setSelectedAnnotationId] = useState<string | null>(null)

  if (error) {
    console.error("Engine error:", error)
    return <div>Error: {error.message}</div>
  }

  if (isLoading || !engine) {
    return <Spinner data-testid="spinner0" />
  }

  return (
    <KeyboardNavigation>
      <EntitySelectionHandler>
        {({ openEntitySelection }) => (
          <div className="flex h-screen flex-1 flex-col overflow-hidden" ref={containerRef}>
            <div className="flex flex-1 overflow-hidden" data-testid="embedpdf">
              {/* Left Pane - PDF Viewer */}
              <div className="flex flex-1 flex-col border-r">
                <Toolbar data-testid="annotation-toolbar" />
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
                    createPluginRegistration(HistoryPluginPackage),
                    createPluginRegistration(SelectionPluginPackage),
                    // register Annotation after InteractionManager, Seletion, History
                    createPluginRegistration(AnnotationPluginPackage),
                    // register Export after Annotation
                    createPluginRegistration(ExportPluginPackage),
                    // register Zoom after InteractionManager, Viewport, Scroll
                    createPluginRegistration(ZoomPluginPackage, {
                      defaultZoomLevel: ZoomMode.Automatic,
                    }),
                    // createPluginRegistration(SearchPluginPackage),
                  ]}
                >
                  {({ pluginsReady }) => (
                    <GlobalPointerProvider>
                      <Viewport className="h-full w-full flex-1 overflow-auto bg-gray-100 select-none">
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
                                  <RenderLayer
                                    pageIndex={pageIndex}
                                    className="pointer-events-none"
                                  />
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
                                    selectionMenu={(props: SelectionMenuProps): JSX.Element => {
                                      // Create a custom selection menu that allows entity assignment
                                      const { annotation, selected, rect } = props
                                      if (selected && annotation.object.contents) {
                                        return (
                                          <div
                                            className="absolute z-50 rounded border border-gray-200 bg-white p-2 shadow-lg"
                                            style={{
                                              left: rect.x,
                                              top: rect.y + rect.height + 4,
                                            }}
                                          >
                                            <button
                                              className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
                                              onClick={() => {
                                                openEntitySelection(
                                                  annotation.object.id,
                                                  annotation.object.contents,
                                                )
                                              }}
                                            >
                                              Assign Entity
                                            </button>
                                          </div>
                                        )
                                      }
                                      return <></>
                                    }}
                                    data-testid="annotation-layer"
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

              {/* Right Pane - Entity Table */}
              <div className="flex w-96 flex-col border-l bg-white">
                <EntityTable onSelectAnnotation={setSelectedAnnotationId} />
              </div>
            </div>
          </div>
        )}
      </EntitySelectionHandler>
    </KeyboardNavigation>
  )
}
