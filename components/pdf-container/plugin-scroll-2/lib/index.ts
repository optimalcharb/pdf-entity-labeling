import { PluginPackage } from "@embedpdf/core"
import { ScrollAction } from "./actions"
import { manifest, SCROLL_PLUGIN_ID } from "./manifest"
import { initialState, scrollReducer } from "./reducer"
import { ScrollPlugin } from "./scroll-plugin"
import { ScrollPluginConfig, ScrollState } from "./types"

export const ScrollPluginPackage: PluginPackage<
  ScrollPlugin,
  ScrollPluginConfig,
  ScrollState,
  ScrollAction
> = {
  manifest,
  create: (registry, config) => new ScrollPlugin(SCROLL_PLUGIN_ID, registry, config),
  reducer: scrollReducer,
  initialState: (coreState, config) => initialState(coreState, config),
}

export { ScrollPlugin } from "./scroll-plugin"
export * from "./types"
export * from "./manifest"
export * from "./types/virtual-item"
export * from "./selectors"
