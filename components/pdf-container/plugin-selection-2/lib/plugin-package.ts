import type { BasePluginConfig, PluginManifest, PluginPackage } from "@embedpdf/core"
import { reducer, type SelectionAction } from "./actions"
import { SelectionPlugin } from "./plugin"
import { initialState, type SelectionState } from "./state"

// ***ID***
export const SELECTION_PLUGIN_ID = "selection"

// ***MANIFEST***
export const manifest: PluginManifest<BasePluginConfig> = {
  id: SELECTION_PLUGIN_ID,
  name: "Selection Plugin",
  version: "1.0.0",
  provides: ["selection"],
  requires: ["interaction-manager"],
  optional: [],
  defaultConfig: {
    enabled: true,
  },
}

// ***PLUGIN PACKAGE***
export const SelectionPluginPackage: PluginPackage<
  SelectionPlugin,
  BasePluginConfig,
  SelectionState,
  SelectionAction
> = {
  manifest,
  create: (registry, _config) => new SelectionPlugin(SELECTION_PLUGIN_ID, registry),
  reducer,
  initialState,
}
