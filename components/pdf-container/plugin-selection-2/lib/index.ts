import { PluginPackage } from "@embedpdf/core"
import { SelectionAction } from "./actions"
import { manifest, SELECTION_PLUGIN_ID } from "./manifest"
import { initialState, selectionReducer } from "./reducer"
import { SelectionPlugin } from "./selection-plugin"
import { SelectionPluginConfig, SelectionState } from "./types"

export const SelectionPluginPackage: PluginPackage<
  SelectionPlugin,
  SelectionPluginConfig,
  SelectionState,
  SelectionAction
> = {
  manifest,
  create: (registry, config) => new SelectionPlugin(SELECTION_PLUGIN_ID, registry, config),
  reducer: selectionReducer,
  initialState,
}

export { SelectionPlugin } from "./selection-plugin"
export * from "./types"
export * from "./manifest"
export * from "./utils"
