import { Fragment, useEffect, useRef, useState } from "react"
import { jsx } from "react/jsx-runtime"
import {
  BasePlugin,
  BasePluginConfig,
  createEmitter,
  ignore,
  PdfErrorCode,
  PluginManifest,
  PluginPackage,
  PluginRegistry,
  REFRESH_PAGES,
  useCapability,
  usePlugin,
} from "../core"

// *****CUSTOM TYPES******
// ***OTHER CUSTOM TYPES***
export interface RenderPageRectOptions {
  pageIndex: number
  rect: any
  options: any
}

export interface RenderPageOptions {
  pageIndex: number
  options: any
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const RENDER_PLUGIN_ID = "render"

// ***STATE***
// no state in this plugin

// ***ACTIONS***
// no actions in this plugin

// ***PLUGIN CAPABILITY***
export interface RenderCapability {
  renderPage: (options: RenderPageOptions) => any
  renderPageRect: (options: RenderPageRectOptions) => any
}

// ***PLUGIN CONFIG***
// uses BasePluginConfig

// ***PLUGIN CLASS***
export class RenderPlugin extends BasePlugin<BasePluginConfig, RenderCapability> {
  static readonly id: string = RENDER_PLUGIN_ID

  private readonly refreshPages$ = createEmitter()

  constructor(id: string, registry: any) {
    super(id, registry)
    this.coreStore.onAction(REFRESH_PAGES, (action: any) => {
      this.refreshPages$.emit(action.payload)
    })
  }

  async initialize(_config: BasePluginConfig) {}

  buildCapability(): RenderCapability {
    return {
      renderPage: this.renderPage.bind(this),
      renderPageRect: this.renderPageRect.bind(this),
    }
  }

  onRefreshPages(fn: (pages: number[]) => void) {
    return this.refreshPages$.on(fn)
  }

  private renderPage({ pageIndex, options }: RenderPageOptions) {
    const coreState = this.coreState.core
    if (!coreState.document) {
      throw new Error("document does not open")
    }
    const page = coreState.document.pages.find((page2: any) => page2.index === pageIndex)
    if (!page) {
      throw new Error("page does not exist")
    }
    return this.engine.renderPage(coreState.document, page, options)
  }

  private renderPageRect({ pageIndex, rect, options }: RenderPageRectOptions) {
    const coreState = this.coreState.core
    if (!coreState.document) {
      throw new Error("document does not open")
    }
    const page = coreState.document.pages.find((page2: any) => page2.index === pageIndex)
    if (!page) {
      throw new Error("page does not exist")
    }
    return this.engine.renderPageRect(coreState.document, page, rect, options)
  }
}

// ***MANIFEST***
const manifest: PluginManifest<BasePluginConfig> = {
  id: RENDER_PLUGIN_ID,
  name: "Render Plugin",
  version: "1.0.0",
  provides: [RENDER_PLUGIN_ID],
  requires: [],
  optional: [],
  defaultConfig: {
    enabled: true,
  },
}

// **PLUGIN PACKAGE***
export const RenderPluginPackage: PluginPackage<RenderPlugin, BasePluginConfig> = {
  manifest,
  create: (registry: PluginRegistry) => new RenderPlugin(RENDER_PLUGIN_ID, registry),
  reducer: () => {},
  initialState: {},
}

// ***PLUGIN HOOKS***
export const useRenderPlugin = () => usePlugin(RENDER_PLUGIN_ID)
export const useRenderCapability = () => useCapability(RENDER_PLUGIN_ID)

// *****COMPONENTS******
interface RenderLayerProps {
  pageIndex: number
  scale?: number
  dpr?: number
  style?: any
  [key: string]: any
}

export function RenderLayer({ pageIndex, scale, dpr, style, ...props }: RenderLayerProps) {
  const { provides: renderProvides } = useRenderCapability()
  const { plugin: renderPlugin } = useRenderPlugin()
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!renderPlugin) return
    return (renderPlugin as any).onRefreshPages((pages: number[]) => {
      if (pages.includes(pageIndex)) {
        setRefreshTick((tick) => tick + 1)
      }
    })
  }, [renderPlugin, pageIndex])

  useEffect(() => {
    if (renderProvides) {
      const task = (renderProvides as any).renderPage({
        pageIndex,
        options: { scaleFactor: scale, dpr: dpr || window.devicePixelRatio },
      })
      task.wait((blob: Blob) => {
        const url = URL.createObjectURL(blob)
        setImageUrl(url)
        urlRef.current = url
      }, ignore)
      return () => {
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current)
          urlRef.current = null
        } else {
          task.abort({
            code: PdfErrorCode.Cancelled,
            message: "canceled render task",
          })
        }
      }
    }
  }, [pageIndex, scale, dpr, renderProvides, refreshTick])

  const handleImageLoad = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }

  return /* @__PURE__ */ jsx(Fragment, {
    children:
      imageUrl &&
      /* @__PURE__ */ jsx("img", {
        src: imageUrl,
        onLoad: handleImageLoad,
        ...props,
        style: {
          width: "100%",
          height: "100%",
          ...(style || {}),
        },
      }),
  })
}
