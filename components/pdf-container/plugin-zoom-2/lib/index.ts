import { PluginPackage } from "@embedpdf/core"
import { ZoomAction } from "./actions"
import { manifest, ZOOM_PLUGIN_ID } from "./manifest"
import { initialDocumentState, initialState, zoomReducer } from "./reducer"
import { ZoomPluginConfig, ZoomState } from "./types"
import { ZoomPlugin } from "./zoom-plugin"

export const ZoomPluginPackage: PluginPackage<ZoomPlugin, ZoomPluginConfig, ZoomState, ZoomAction> =
  {
    manifest,
    create: (registry, config) => new ZoomPlugin(ZOOM_PLUGIN_ID, registry, config),
    reducer: zoomReducer,
    initialState,
  }

export { ZoomPlugin } from "./zoom-plugin"
export * from "./types"
export * from "./manifest"
export { initialState, initialDocumentState }
