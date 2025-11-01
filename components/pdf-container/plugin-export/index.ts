import { useEffect, useRef } from "react"
import { jsx } from "react/jsx-runtime"
import {
  BasePlugin,
  BasePluginConfig,
  createEmitter,
  createPluginPackage,
  ignore,
  Listener,
  PdfErrorCode,
  PdfErrorReason,
  PdfTaskHelper,
  type PluginManifest,
  PluginPackage,
  PluginRegistry,
  Task,
  Unsubscribe,
  useCapability,
  usePlugin,
} from "../core"

// *****CUSTOM TYPES******
// ***OTHER CUSTOM TYPES***
export interface BufferAndName {
  buffer: ArrayBuffer
  name: string
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const EXPORT_PLUGIN_ID = "export"

// ***STATE***
// no state for this plugin

// **ACTIONS***
// no actions for this plugin

// ***PLUGIN CAPABILITY***
export interface ExportCapability {
  saveAsCopy: () => Task<ArrayBuffer, PdfErrorReason>
  download: () => void
}

// ***PLUGIN CONFIG***
export interface ExportPluginConfig extends BasePluginConfig {
  defaultFileName: string
}

// ***PLUGIN CLASS***
export class ExportPlugin extends BasePlugin<ExportPluginConfig, ExportCapability> {
  static readonly id: string = EXPORT_PLUGIN_ID

  private readonly downloadRequest$ = createEmitter<"download">()
  private readonly config: ExportPluginConfig

  constructor(id: string, registry: PluginRegistry, config: ExportPluginConfig) {
    super(id, registry)
    this.config = config
  }

  async initialize(_: ExportPluginConfig): Promise<void> {}

  // capability functions to enable the client program to...
  buildCapability(): ExportCapability {
    return {
      saveAsCopy: this.saveAsCopy.bind(this),
      download: this.download.bind(this),
    }
  }

  onRequest(event: Listener<"download">): Unsubscribe {
    return this.downloadRequest$.on(event)
  }

  private download() {
    this.downloadRequest$.emit("download")
  }

  saveAsCopyAndGetBufferAndName(): Task<BufferAndName, PdfErrorReason> {
    const task = new Task<BufferAndName, PdfErrorReason>()
    const document = this.coreState.core.document
    if (!document)
      return PdfTaskHelper.reject({
        code: PdfErrorCode.DocNotOpen,
        message: "Document not found",
      })
    this.saveAsCopy().wait((result) => {
      task.resolve({
        buffer: result,
        name: document.name ?? this.config.defaultFileName,
      })
    }, task.fail)
    return task
  }

  private saveAsCopy() {
    const document = this.coreState.core.document
    if (!document)
      return PdfTaskHelper.reject({
        code: PdfErrorCode.DocNotOpen,
        message: "Document not found",
      })
    return this.engine.saveAsCopy(document)
  }
}

// ***MANIFEST***
const manifest: PluginManifest<ExportPluginConfig> = {
  id: EXPORT_PLUGIN_ID,
  name: "Export Plugin",
  version: "1.0.0",
  provides: [EXPORT_PLUGIN_ID],
  requires: [],
  optional: [],
  defaultConfig: {
    enabled: true,
    defaultFileName: "document.pdf",
  },
}

// **PLUGIN PACAKGE***
const ExportPluginPackageV1: PluginPackage<ExportPlugin, ExportPluginConfig> = {
  manifest,
  create: (registry: PluginRegistry, config: ExportPluginConfig) =>
    new ExportPlugin(EXPORT_PLUGIN_ID, registry, config),
  reducer: () => {},
  initialState: {},
}

export const ExportPluginPackage = createPluginPackage(ExportPluginPackageV1)
  .addUtility(Download)
  .build()

// ***PLUGIN HOOKS***
export const useExportPlugin = () => usePlugin(EXPORT_PLUGIN_ID)
export const useExportCapability = () => useCapability(EXPORT_PLUGIN_ID)

// *****COMPONENTS******
export function Download(props: { fileName?: string }) {
  const { provides: exportCapability } = useExportCapability()
  const { plugin: exportPlugin } = useExportPlugin()
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!exportCapability) return
    if (!exportPlugin) return
    const unsub = (exportPlugin as any).onRequest((action: "download") => {
      if (action === "download") {
        const el = ref.current
        if (!el) return
        const task = (exportPlugin as any).saveAsCopyAndGetBufferAndName()
        task.wait(({ buffer, name }: { buffer: ArrayBuffer; name: string }) => {
          const url = URL.createObjectURL(new Blob([buffer]))
          el.href = url
          el.download = props.fileName ?? name
          el.click()
          URL.revokeObjectURL(url)
        }, ignore)
      }
    })
    return unsub
  }, [exportCapability, exportPlugin])

  return /* @__PURE__ */ jsx("a", { style: { display: "none" }, ref })
}
