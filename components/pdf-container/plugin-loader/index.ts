import React, { Fragment, useEffect, useRef } from "react"
import { jsx } from "react/jsx-runtime"
import {
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  createEmitter,
  createPluginPackage,
  type EventHook,
  loadDocument,
  type PdfDocumentObject,
  type PdfEngine,
  type PdfFile,
  type PdfFileUrl,
  type PdfOpenDocumentBufferOptions,
  type PdfOpenDocumentUrlOptions,
  type PluginManifest,
  PluginPackage,
  PluginRegistry,
  setDocument,
  useCapability,
  usePlugin,
} from "../core"

// *****CUSTOM TYPES******
// ***EVENTS***
export interface LoaderEvent {
  type: "start" | "complete" | "error"
  documentId?: string
  error?: Error
}

// ***OTHER CUSTOM TYPES***
export interface PDFUrlLoadingOptions {
  type: "url"
  pdfFile: PdfFileUrl
  options?: PdfOpenDocumentUrlOptions
  engine: PdfEngine
}

export interface PDFBufferLoadingOptions {
  type: "buffer"
  pdfFile: PdfFile
  options?: PdfOpenDocumentBufferOptions
  engine: PdfEngine
}

export type PDFLoadingOptions = PDFUrlLoadingOptions | PDFBufferLoadingOptions

export interface PDFLoadingStrategy {
  load(options?: PDFLoadingOptions): Promise<PdfDocumentObject>
}

export type StrategyResolver = (options: PDFLoadingOptions) => PDFLoadingStrategy | undefined

// Strategy implementations
class UrlStrategy {
  async load(loadingOptions: PDFUrlLoadingOptions): Promise<PdfDocumentObject> {
    const { pdfFile, options, engine } = loadingOptions
    const task = engine.openDocumentUrl(pdfFile, options)
    return new Promise((resolve, reject) => {
      task.wait(
        (result: PdfDocumentObject) => resolve(result),
        (error: any) => {
          if (error.type === "abort") {
            reject(new Error(`PDF loading aborted: ${error.reason}`))
          } else {
            reject(new Error(`PDF loading failed: ${error.reason}`))
          }
        },
      )
    })
  }
}

class BufferStrategy {
  async load(loadingOptions: PDFBufferLoadingOptions): Promise<PdfDocumentObject> {
    const { pdfFile, options, engine } = loadingOptions
    const task = engine.openDocumentBuffer(pdfFile, options)
    return new Promise((resolve, reject) => {
      task.wait(
        (result: PdfDocumentObject) => resolve(result),
        (error: any) => {
          if (error.type === "abort") {
            reject(new Error(`PDF loading aborted: ${error.reason}`))
          } else {
            reject(new Error(`PDF loading failed: ${error.reason}`))
          }
        },
      )
    })
  }
}

class PDFDocumentLoader {
  strategies = new Map<string, PDFLoadingStrategy>()
  strategyResolvers: StrategyResolver[] = []

  constructor() {
    // Register default strategies
    this.registerStrategy("url", new UrlStrategy())
    this.registerStrategy("buffer", new BufferStrategy())

    // Add default strategy resolver
    this.addStrategyResolver((options: PDFLoadingOptions) => {
      if (isPdfUrlLoadingOptions(options)) {
        return this.strategies.get("url") || undefined
      }
      return this.strategies.get("buffer") || undefined
    })
  }

  registerStrategy(name: string, strategy: PDFLoadingStrategy): void {
    this.strategies.set(name, strategy)
  }

  getStrategy(name: string): PDFLoadingStrategy | undefined {
    return this.strategies.get(name)
  }

  addStrategyResolver(resolver: StrategyResolver): void {
    this.strategyResolvers.push(resolver)
  }

  async loadDocument(options: PDFLoadingOptions): Promise<PdfDocumentObject> {
    try {
      const strategy = this.resolveStrategy(options)
      if (!strategy) {
        throw new Error("No suitable strategy found for the given options")
      }
      return await strategy.load(options)
    } catch (error) {
      console.error("Error loading document:", error)
      throw error
    }
  }

  resolveStrategy(options: PDFLoadingOptions): PDFLoadingStrategy | undefined {
    for (const resolver of this.strategyResolvers) {
      const strategy = resolver(options)
      if (strategy) {
        return strategy
      }
    }
    return undefined
  }
}

function isPdfUrlLoadingOptions(options: PDFLoadingOptions): options is PDFUrlLoadingOptions {
  return options.type === "url"
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const LOADER_PLUGIN_ID = "loader"

// ***STATE***
// no state for this plugin

// **ACTIONS***
// no actions for this plugin

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

// ***PLUGIN CONFIG***
export interface LoaderPluginConfig extends BasePluginConfig {
  defaultStrategies?: {
    [key: string]: PDFLoadingStrategy
  }
  loadingOptions?: Omit<PDFLoadingOptions, "engine">
}

// ***PLUGIN CLASS***
export class LoaderPlugin extends BasePlugin<LoaderPluginConfig, LoaderCapability> {
  static readonly id: string = LOADER_PLUGIN_ID

  readonly id: string
  private readonly loaderHandlers$ = createBehaviorEmitter<LoaderEvent>()
  private readonly documentLoadedHandlers$ = createBehaviorEmitter<PdfDocumentObject>()
  private readonly openFileRequest$ = createEmitter<"open">()
  private documentLoader: PDFDocumentLoader
  private loadingOptions?: Omit<PDFLoadingOptions, "engine">
  private loadedDocument?: PdfDocumentObject

  constructor(id: string, registry: PluginRegistry) {
    super(id, registry)
    this.id = id
    this.documentLoader = new PDFDocumentLoader()
  }

  protected buildCapability(): LoaderCapability {
    return {
      onLoaderEvent: this.loaderHandlers$.on,
      onDocumentLoaded: this.documentLoadedHandlers$.on,
      onOpenFileRequest: this.openFileRequest$.on,
      openFileDialog: () => this.openFileRequest$.emit("open"),
      loadDocument: (options: Omit<PDFLoadingOptions, "engine">) => this.loadDocument(options),
      registerStrategy: (name: string, strategy: PDFLoadingStrategy) =>
        this.documentLoader.registerStrategy(name, strategy),
      getDocument: () => this.loadedDocument,
      addStrategyResolver: (resolver: StrategyResolver) =>
        this.documentLoader.addStrategyResolver(resolver),
    }
  }

  async initialize(config: LoaderPluginConfig) {
    if (config.defaultStrategies) {
      Object.entries(config.defaultStrategies).forEach(([name, strategy]) => {
        this.documentLoader.registerStrategy(name, strategy)
      })
    }
    if (config.loadingOptions) {
      this.loadingOptions = config.loadingOptions
    }
  }

  async postInitialize() {
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
      this.loaderHandlers$.emit({
        type: "start",
        documentId: options.pdfFile.id,
      })
      this.dispatchCoreAction(loadDocument())
      const document = await this.documentLoader.loadDocument({
        ...options,
        engine: this.engine,
      } as PDFLoadingOptions)
      this.dispatchCoreAction(setDocument(document))
      this.loadedDocument = document
      this.loaderHandlers$.emit({
        type: "complete",
        documentId: options.pdfFile.id,
      })
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

  async destroy() {
    this.loaderHandlers$.clear()
    this.documentLoadedHandlers$.clear()
    this.openFileRequest$.clear()
    super.destroy()
  }
}

// ***MANIFEST***
const manifest: PluginManifest<LoaderPluginConfig> = {
  id: LOADER_PLUGIN_ID,
  name: "Loader Plugin",
  version: "1.0.0",
  provides: [LOADER_PLUGIN_ID],
  requires: [],
  optional: [],
  defaultConfig: {
    enabled: true,
  },
}

// ***PLUGIN PACKAGE***
const LoaderPluginPackageV1: PluginPackage<LoaderPlugin, LoaderPluginConfig> = {
  manifest,
  create: (registry: PluginRegistry) => new LoaderPlugin(LOADER_PLUGIN_ID, registry),
  reducer: () => {},
  initialState: {},
}

export const LoaderPluginPackage = createPluginPackage(LoaderPluginPackageV1)
  .addUtility(FilePicker)
  .build()

// ***PLUGIN HOOKS***
export const useLoaderPlugin = () => usePlugin<LoaderPlugin>(LOADER_PLUGIN_ID)
export const useLoaderCapability = () => useCapability<LoaderPlugin>(LOADER_PLUGIN_ID)

// *****COMPONENTS******
function FilePicker() {
  const capability = useCapability(LOADER_PLUGIN_ID)
  const cap = (capability as any)?.provides as LoaderCapability
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!cap) return
    const unsub = cap.onOpenFileRequest((req: "open") => {
      if (req === "open" && inputRef.current) inputRef.current.click()
    })
    return unsub
  }, [cap])

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file && cap) {
      await cap.loadDocument({
        type: "buffer",
        pdfFile: {
          id: Math.random().toString(36).substring(2, 15),
          name: file.name,
          content: await file.arrayBuffer(),
        },
      })
    }
  }

  return /* @__PURE__ */ jsx(Fragment, {
    children: /* @__PURE__ */ jsx("input", {
      ref: inputRef,
      type: "file",
      accept: "application/pdf",
      style: { display: "none" },
      onChange,
    }),
  })
}
