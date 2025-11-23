import { PluginManifest, PluginPackage } from "@embedpdf/core"
import { reducer, ScrollAction } from "./actions"
import { ScrollPlugin, ScrollPluginConfig } from "./scroll-plugin"
import { initialState, type ScrollState } from "./state"

export const SCROLL_PLUGIN_ID = "scroll"

export const manifest: PluginManifest<ScrollPluginConfig> = {
  id: SCROLL_PLUGIN_ID,
  name: "Scroll Plugin",
  version: "1.0.0",
  provides: ["scroll"],
  requires: ["viewport"],
  optional: [],
  defaultConfig: {
    enabled: true,
    pageGap: 10,
  },
}

export const ScrollPluginPackage: PluginPackage<
  ScrollPlugin,
  ScrollPluginConfig,
  ScrollState,
  ScrollAction
> = {
  manifest,
  create: (registry, config) => new ScrollPlugin(SCROLL_PLUGIN_ID, registry, config),
  reducer,
  initialState: (coreState, config) => initialState(coreState, config),
}
