import type { PluginManifest, PluginPackage } from "@embedpdf/core"
import { InteractionManagerAction, reducer } from "./actions"
import { InteractionManagerPlugin, InteractionManagerPluginConfig } from "./plugin"
import { initialState, type InteractionManagerState } from "./state"

// ***PLUGIN ID***
export const INTERACTION_MANAGER_PLUGIN_ID = "interaction-manager"

// ***PLUGIN MANIFEST***
export const manifest: PluginManifest<InteractionManagerPluginConfig> = {
  id: INTERACTION_MANAGER_PLUGIN_ID,
  name: "Interaction Manager Plugin",
  version: "1.0.0",
  provides: ["interaction-manager"],
  requires: [],
  optional: [],
  defaultConfig: {
    enabled: true,
    exclusionRules: {
      classes: [],
      dataAttributes: ["data-no-interaction"],
    },
  },
}

// ***PLUGIN PACKAGE***
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
