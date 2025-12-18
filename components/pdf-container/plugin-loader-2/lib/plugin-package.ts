import { PluginManifest, PluginPackage } from "@embedpdf/core"
import { LoaderPlugin, LoaderPluginConfig } from "./plugin"

// ***ID***
export const LOADER_PLUGIN_ID = "loader"

// ***MANIFEST***
export const manifest: PluginManifest<LoaderPluginConfig> = {
  id: LOADER_PLUGIN_ID,
  name: "Loader Plugin",
  version: "1.0.0",
  provides: ["loader"],
  requires: [],
  optional: [],
  metadata: {
    name: "Loader Plugin",
    description: "A plugin for loading PDF documents",
    version: "1.0.0",
    author: "EmbedPDF",
    license: "MIT",
  },
  defaultConfig: {
    enabled: true,
  },
}

// ***PLUGIN PACKAGE***
export const LoaderPluginPackage: PluginPackage<LoaderPlugin, LoaderPluginConfig> = {
  manifest,
  create: (registry) => new LoaderPlugin(LOADER_PLUGIN_ID, registry),
  reducer: () => {},
  initialState: {},
}
