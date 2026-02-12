import { useRef } from "react"
import { createPluginRegistration } from "@embedpdf/core"
import { EmbedPDF } from "@embedpdf/core/react"
import { usePdfiumEngine } from "@embedpdf/engines/react"
import { NoopLogger } from "@embedpdf/models"
import {
  DocumentContent,
  DocumentManagerPluginPackage,
  InitialDocumentOptions,
} from "@embedpdf/plugin-document-manager/react"
import { ExportPluginPackage } from "@embedpdf/plugin-export/react"
import { RenderLayer, RenderPluginPackage } from "@embedpdf/plugin-render/react"
import { RotatePluginPackage } from "@embedpdf/plugin-rotate/react"
import { ThumbnailPluginPackage } from "@embedpdf/plugin-thumbnail/react"
import { TilingLayer, TilingPluginPackage } from "@embedpdf/plugin-tiling/react"
import { Viewport, ViewportPluginPackage } from "@embedpdf/plugin-viewport/react"
import PluginStoreSync from "../plugin-store/components/plugin-store-sync"
import { Spinner } from "../shadcn-ui/spinner"
import { AnnotationLayer, AnnotationPluginPackage } from "./plugin-annotation-2"
import {
  GlobalPointerProvider,
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from "./plugin-interaction-manager-2"
import { Scroller, ScrollPluginPackage, ScrollStrategy } from "./plugin-scroll-2"
import { SearchLayer, SearchPluginPackage } from "./plugin-search-2"
import { MarqueeSelection, SelectionLayer, SelectionPluginPackage } from "./plugin-selection-2"
import { ZoomGestureWrapper, ZoomMode, ZoomPluginPackage } from "./plugin-zoom-2"
import RotateWrapper from "./rotate-wrapper"
import Toolbar from "./toolbar"

interface PDFContainerProps {
  initalDocuments: InitialDocumentOptions[]
  author?: string
  exportName?: string
  canRotate?: boolean
}

const logger = new NoopLogger()

export default function PDFContainer({
  initalDocuments,
  author = "anonymous",
  exportName = "labeled.pdf",
  canRotate = true,
}: PDFContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { engine, isLoading, error } = usePdfiumEngine({
    wasmUrl: `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/engines/pdfium.wasm`,
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
          config={{
            logger: logger,
            permissions: { enforceDocumentPermissions: false }, // disable permissions set in PDF metadata
          }}
          engine={engine}
          plugins={[
            // register DocumentManager first
            createPluginRegistration(DocumentManagerPluginPackage, {
              initialDocuments: initalDocuments,
            }),
            createPluginRegistration(ViewportPluginPackage, {
              viewportGap: 5,
            }),
            // register Scroll after DocumentManager, Viewport
            createPluginRegistration(ScrollPluginPackage, {
              defaultStrategy: ScrollStrategy.Vertical,
            }),
            createPluginRegistration(RenderPluginPackage),
            ...(canRotate ? [createPluginRegistration(RotatePluginPackage)] : []),
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
            createPluginRegistration(AnnotationPluginPackage, { author }),
            // register Export after Annotation
            createPluginRegistration(ExportPluginPackage, {
              defaultFileName: exportName,
            }),
            // register Zoom after InteractionManager, Viewport, Scroll
            createPluginRegistration(ZoomPluginPackage, {
              defaultZoomLevel: ZoomMode.Automatic,
            }),
            // register Search after Scroll, Selection
            createPluginRegistration(SearchPluginPackage),
          ]}
        >
          {({ pluginsReady, activeDocumentId }) =>
            pluginsReady && activeDocumentId ? (
              <DocumentContent documentId={activeDocumentId}>
                {({ isLoaded }) =>
                  isLoaded ? (
                    <GlobalPointerProvider documentId={activeDocumentId}>
                      <PluginStoreSync />
                      <Toolbar canRotate={canRotate} data-testid="annotation-toolbar" />
                      <Viewport
                        documentId={activeDocumentId}
                        className="h-full w-full flex-1 overflow-hidden bg-gray-100 select-none"
                      >
                        <ZoomGestureWrapper documentId={activeDocumentId}>
                          <Scroller
                            documentId={activeDocumentId}
                            renderPage={({ pageIndex }) => (
                              <RotateWrapper
                                enabled={canRotate}
                                documentId={activeDocumentId}
                                pageIndex={pageIndex}
                              >
                                <PagePointerProvider
                                  documentId={activeDocumentId}
                                  pageIndex={pageIndex}
                                >
                                  {/* RenderLayer must go first */}
                                  <RenderLayer
                                    documentId={activeDocumentId}
                                    pageIndex={pageIndex}
                                    style={{ pointerEvents: "none" }}
                                  />
                                  <TilingLayer
                                    documentId={activeDocumentId}
                                    pageIndex={pageIndex}
                                    style={{ pointerEvents: "none" }}
                                  />
                                  <AnnotationLayer
                                    documentId={activeDocumentId}
                                    pageIndex={pageIndex}
                                    data-testid="annotation-layer"
                                  />
                                  <SearchLayer
                                    documentId={activeDocumentId}
                                    pageIndex={pageIndex}
                                    highlightColor={"#FFFF00"}
                                    activeHighlightColor={"#FFFF00"}
                                  />
                                  {/* SelectionLayer must go last */}
                                  <SelectionLayer
                                    documentId={activeDocumentId}
                                    pageIndex={pageIndex}
                                  />
                                  <MarqueeSelection
                                    documentId={activeDocumentId}
                                    pageIndex={pageIndex}
                                  />
                                </PagePointerProvider>
                              </RotateWrapper>
                            )}
                          />
                        </ZoomGestureWrapper>
                      </Viewport>
                    </GlobalPointerProvider>
                  ) : (
                    <Spinner data-testid="spinner4" />
                  )
                }
              </DocumentContent>
            ) : (
              <Spinner data-testid="spinner3" />
            )
          }
        </EmbedPDF>
      </div>
    </div>
  )
}