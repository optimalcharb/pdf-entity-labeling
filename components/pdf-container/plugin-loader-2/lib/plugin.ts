import {
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  createEmitter,
  EventHook,
  loadDocument,
  PluginRegistry,
  setDocument,
} from "@embedpdf/core"
import { PdfDocumentObject } from "@embedpdf/models"
import type { LoaderEvent } from "./custom-types"
import { PDFDocumentLoader, StrategyResolver } from "./document-loader"
import { PDFLoadingOptions, PDFLoadingStrategy } from "./strategies/loading-strategy"

// ***PLUGIN CONFIG***
export interface LoaderPluginConfig extends BasePluginConfig {
  defaultStrategies?: { [key: string]: PDFLoadingStrategy }
  loadingOptions?: Omit<PDFLoadingOptions, "engine">
}

// ***PLUGIN CAPABILITY***
export interface LoaderCapability {
  onLoaderEvent: EventHook<LoaderEvent>
  onDocumentLoaded: EventHook<PdfDocumentObject>
  onOpenFileRequest: EventHook<"open">
  loadDocument(options: Omit<PDFLoadingOptions, "engine">): Promise<PdfDocumentObject>
  registerStrategy(name: string, strategy: PDFLoadingStrategy): void
  getDocument(): PdfDocumentObject | undefined
  addStrategyResolver(resolver: StrategyResolver): void
  openFileDialog: () => void
}

// ***PLUGIN CLASS***
export class LoaderPlugin extends BasePlugin<LoaderPluginConfig, LoaderCapability> {
  static readonly id = "loader" as const

  private readonly loaderHandlers$ = createBehaviorEmitter<LoaderEvent>()
  private readonly documentLoadedHandlers$ = createBehaviorEmitter<PdfDocumentObject>()
  private readonly openFileRequest$ = createEmitter<"open">()

  private documentLoader: PDFDocumentLoader
  private loadingOptions?: Omit<PDFLoadingOptions, "engine">
  private loadedDocument?: PdfDocumentObject

  constructor(
    public readonly id: string,
    registry: PluginRegistry,
  ) {
    super(id, registry)
    this.documentLoader = new PDFDocumentLoader()
  }

  async initialize(config: LoaderPluginConfig): Promise<void> {
    // Register any custom strategies provided in config
    if (config.defaultStrategies) {
      Object.entries(config.defaultStrategies).forEach(([name, strategy]) => {
        this.documentLoader.registerStrategy(name, strategy)
      })
    }

    if (config.loadingOptions) {
      this.loadingOptions = config.loadingOptions
    }
  }

  protected buildCapability(): LoaderCapability {
    return {
      onLoaderEvent: this.loaderHandlers$.on,
      onDocumentLoaded: this.documentLoadedHandlers$.on,
      onOpenFileRequest: this.openFileRequest$.on,
      openFileDialog: () => this.openFileRequest$.emit("open"),
      loadDocument: (options) => this.loadDocument(options),
      registerStrategy: (name, strategy) => this.documentLoader.registerStrategy(name, strategy),
      getDocument: () => this.loadedDocument,
      addStrategyResolver: (resolver) => this.documentLoader.addStrategyResolver(resolver),
    }
  }

  async postInitialize(): Promise<void> {
    if (this.loadingOptions) {
      await this.loadDocument(this.loadingOptions)
    }
  }

  private async loadDocument(
    options: Omit<PDFLoadingOptions, "engine">,
  ): Promise<PdfDocumentObject> {
    try {
      if (this.loadedDocument) {
        this.engine.closeDocument(this.loadedDocument)
      }
      this.loaderHandlers$.emit({ type: "start", documentId: options.pdfFile.id })
      this.dispatchCoreAction(loadDocument())
      const document = await this.documentLoader.loadDocument({
        ...options,
        engine: this.engine,
      } as PDFLoadingOptions)
      this.dispatchCoreAction(setDocument(document))
      this.loadedDocument = document

      this.loaderHandlers$.emit({ type: "complete", documentId: options.pdfFile.id })
      this.documentLoadedHandlers$.emit(document)
      return document
    } catch (error) {
      const errorEvent: LoaderEvent = {
        type: "error",
        documentId: options.pdfFile.id,
        error: error instanceof Error ? error : new Error(String(error)),
      }
      this.loaderHandlers$.emit(errorEvent)
      throw error
    }
  }

  async destroy(): Promise<void> {
    this.loaderHandlers$.clear()
    this.documentLoadedHandlers$.clear()
    this.openFileRequest$.clear()
    super.destroy()
  }
}
