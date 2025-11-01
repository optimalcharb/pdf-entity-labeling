{
  /* <EmbedPDF
logger={config.log ? logger : undefined}
engine={engine}
onInitialized={async (registry) => {
  const uiCapability = registry.getPlugin<UIPlugin>('ui')?.provides();

  if (uiCapability) {
    uiCapability.registerComponentRenderer('groupedItems', groupedItemsRenderer);
    uiCapability.registerComponentRenderer('iconButton', iconButtonRenderer);
    uiCapability.registerComponentRenderer('tabButton', tabButtonRenderer);
    uiCapability.registerComponentRenderer('header', headerRenderer);
    uiCapability.registerComponentRenderer('divider', dividerRenderer);
    uiCapability.registerComponentRenderer('panel', panelRenderer);
    uiCapability.registerComponentRenderer('search', searchRenderer);
    uiCapability.registerComponentRenderer('zoom', zoomRenderer);
    uiCapability.registerComponentRenderer(
      'pageControlsContainer',
      pageControlsContainerRenderer,
    );
    uiCapability.registerComponentRenderer('pageControls', pageControlsRenderer);
    uiCapability.registerComponentRenderer('commandMenu', commandMenuRenderer);
    uiCapability.registerComponentRenderer('comment', commentRender);
    uiCapability.registerComponentRenderer('thumbnails', thumbnailsRender);
    uiCapability.registerComponentRenderer('outline', outlineRenderer);
    uiCapability.registerComponentRenderer('attachments', attachmentsRenderer);
    uiCapability.registerComponentRenderer('selectButton', selectButtonRenderer);
    uiCapability.registerComponentRenderer('textSelectionMenu', textSelectionMenuRenderer);
    uiCapability.registerComponentRenderer('leftPanelMain', leftPanelMainRenderer);
    uiCapability.registerComponentRenderer('printModal', printModalRenderer);
    uiCapability.registerComponentRenderer(
      'leftPanelAnnotationStyle',
      leftPanelAnnotationStyleRenderer,
    );
  }
}}
plugins={[
  createPluginRegistration(UIPluginPackage, uiConfig),
  createPluginRegistration(LoaderPluginPackage, {
    loadingOptions: {
      type: 'url',
      pdfFile: {
        id: 'pdf',
        name: 'embedpdf-ebook.pdf',
        url: config.src,
      },
    },
  }),
  createPluginRegistration(ViewportPluginPackage, pluginConfigs.viewport),
  createPluginRegistration(ScrollPluginPackage, pluginConfigs.scroll),
  createPluginRegistration(ZoomPluginPackage, pluginConfigs.zoom),
  createPluginRegistration(SpreadPluginPackage, pluginConfigs.spread),
  createPluginRegistration(RenderPluginPackage),
  createPluginRegistration(RotatePluginPackage, pluginConfigs.rotate),
  createPluginRegistration(SearchPluginPackage),
  createPluginRegistration(SelectionPluginPackage),
  createPluginRegistration(TilingPluginPackage, pluginConfigs.tiling),
  createPluginRegistration(ThumbnailPluginPackage, pluginConfigs.thumbnail),
  createPluginRegistration(AnnotationPluginPackage),
  createPluginRegistration(PrintPluginPackage),
  createPluginRegistration(FullscreenPluginPackage),
  createPluginRegistration(BookmarkPluginPackage),
  createPluginRegistration(ExportPluginPackage),
  createPluginRegistration(InteractionManagerPluginPackage),
  createPluginRegistration(PanPluginPackage),
  createPluginRegistration(CapturePluginPackage, {
    scale: 2,
    imageType: 'image/png',
  }),
  createPluginRegistration(HistoryPluginPackage),
  createPluginRegistration(RedactionPluginPackage, {
    drawBlackBoxes: true,
  }),
  createPluginRegistration(AttachmentPluginPackage),
]}
>
{({ pluginsReady }) => (
  <PluginUIProvider>
    {({ headers, panels, floating, commandMenu }) => (
      <>
        <div className="@container relative flex h-full w-full select-none flex-col">
          {headers.top.length > 0 && <div>{headers.top}</div>}
          <div className="flex flex-1 flex-row overflow-hidden">
            <div className="flex flex-col">{headers.left}</div>
            <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
              {panels.left.length > 0 && <Fragment>{panels.left}</Fragment>}
              <div className="relative flex w-full flex-1 overflow-hidden">
                <GlobalPointerProvider>
                  <Viewport
                    style={{
                      width: '100%',
                      height: '100%',
                      flexGrow: 1,
                      backgroundColor: '#f1f3f5',
                      overflow: 'auto',
                    }}
                  >
                    {!pluginsReady && (
                      <div className="flex h-full w-full items-center justify-center">
                        <LoadingIndicator size="lg" text="Loading PDF document..." />
                      </div>
                    )}
                    {pluginsReady && (
                      <PinchWrapper>
                        <Scroller
                          renderPage={({
                            pageIndex,
                            scale,
                            rotation,
                            width,
                            height,
                            document,
                          }) => (
                            <Rotate
                              key={document?.id}
                              pageSize={{ width, height }}
                              style={{ backgroundColor: '#fff' }}
                            >
                              <PagePointerProvider
                                rotation={rotation}
                                scale={scale}
                                pageWidth={width}
                                pageHeight={height}
                                pageIndex={pageIndex}
                              >
                                <RenderLayer
                                  pageIndex={pageIndex}
                                  className="pointer-events-none"
                                />
                                <TilingLayer
                                  pageIndex={pageIndex}
                                  scale={scale}
                                  className="pointer-events-none"
                                />
                                <SearchLayer
                                  pageIndex={pageIndex}
                                  scale={scale}
                                  className="pointer-events-none"
                                />
                                <HintLayer />
                                <AnnotationLayer
                                  pageIndex={pageIndex}
                                  scale={scale}
                                  pageWidth={width}
                                  pageHeight={height}
                                  rotation={rotation}
                                  selectionMenu={({
                                    selected,
                                    rect,
                                    annotation,
                                    menuWrapperProps,
                                  }) => (
                                    <div
                                      {...menuWrapperProps}
                                      style={{
                                        ...menuWrapperProps.style,
                                        display: 'flex',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {selected ? (
                                        <AnnotationMenu
                                          trackedAnnotation={annotation}
                                          style={{
                                            pointerEvents: 'auto',
                                            position: 'absolute',
                                            top: rect.size.height + 10,
                                          }}
                                        />
                                      ) : null}
                                    </div>
                                  )}
                                />
                                <MarqueeZoom pageIndex={pageIndex} scale={scale} />
                                <MarqueeCapture pageIndex={pageIndex} scale={scale} />
                                <RedactionLayer
                                  pageIndex={pageIndex}
                                  scale={scale}
                                  rotation={rotation}
                                  selectionMenu={({
                                    item,
                                    selected,
                                    rect,
                                    menuWrapperProps,
                                  }) => (
                                    <div
                                      {...menuWrapperProps}
                                      style={{
                                        ...menuWrapperProps.style,
                                        display: 'flex',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {selected ? (
                                        <RedactionMenu
                                          item={item}
                                          pageIndex={pageIndex}
                                          style={{
                                            pointerEvents: 'auto',
                                            position: 'absolute',
                                            top: rect.size.height + 10,
                                          }}
                                        />
                                      ) : null}
                                    </div>
                                  )}
                                />
                                <SelectionLayer pageIndex={pageIndex} scale={scale} />
                              </PagePointerProvider>
                            </Rotate>
                          )}
                          overlayElements={floating.insideScroller}
                        />
                      </PinchWrapper>
                    )}
                    {floating.outsideScroller}
                  </Viewport>
                </GlobalPointerProvider>
              </div>
              {panels.right.length > 0 && <Fragment>{panels.right}</Fragment>}
            </div>
            <div className="flex flex-col">{headers.right}</div>
          </div>
          {headers.bottom.length > 0 && <div>{headers.bottom}</div>}
          {commandMenu}
        </div>
        <Capture />
      </>
    )}
  </PluginUIProvider>
)}
</EmbedPDF>
</> */
}
