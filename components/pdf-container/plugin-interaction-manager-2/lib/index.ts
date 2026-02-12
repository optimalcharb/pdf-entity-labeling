import { PluginPackage } from "@embedpdf/core"
import { InteractionManagerAction } from "./actions"
import { InteractionManagerPlugin } from "./interaction-manager-plugin"
import { INTERACTION_MANAGER_PLUGIN_ID, manifest } from "./manifest"
import { initialState, reducer } from "./reducer"
import { InteractionManagerPluginConfig, InteractionManagerState } from "./types"

export const InteractionManagerPluginPackage: PluginPackage<
  InteractionManagerPlugin,
  InteractionManagerPluginConfig,
  InteractionManagerState,
  InteractionManagerAction
> = {
  manifest,
  create: (registry, config) =>
    new InteractionManagerPlugin(INTERACTION_MANAGER_PLUGIN_ID, registry, config),
  reducer,
  initialState,
}

export { InteractionManagerPlugin } from "./interaction-manager-plugin"
export * from "./types"
export * from "./manifest"
export * from "./reducer"
