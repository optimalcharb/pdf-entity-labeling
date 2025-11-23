import { PluginManifest } from "@embedpdf/core"
import { UIPluginConfig } from "./types"

export const UI_PLUGIN_ID = "ui"

export const manifest: PluginManifest<UIPluginConfig> = {
  id: UI_PLUGIN_ID,
  name: "UI Plugin",
  version: "1.0.0",
  provides: ["ui"],
  requires: [],
  optional: [],
  defaultConfig: {
    enabled: true,
    components: {},
  },
}
