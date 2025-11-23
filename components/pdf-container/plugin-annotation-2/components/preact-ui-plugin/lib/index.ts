import { PluginPackage } from "@embedpdf/core"
import { UIPluginAction } from "./actions"
import { manifest, UI_PLUGIN_ID } from "./manifest"
import { initialState, uiReducer } from "./reducer"
import { UIPluginConfig, UIPluginState } from "./types"
import { UIPlugin } from "./ui-plugin"

export const UIPluginPackage: PluginPackage<
  UIPlugin,
  UIPluginConfig,
  UIPluginState,
  UIPluginAction
> = {
  manifest,
  create: (registry, config) => new UIPlugin(UI_PLUGIN_ID, registry, config),
  reducer: uiReducer,
  initialState,
}

export * from "./manifest"
export * from "./ui-plugin"
export * from "./types"
export * from "./ui-component"
export * from "./utils"
export * from "./menu/types"
export * from "./menu/utils"
