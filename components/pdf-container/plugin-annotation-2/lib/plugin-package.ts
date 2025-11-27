import type { PluginManifest, PluginPackage } from "@embedpdf/core"
import { AnnotationAction, reducer } from "./actions"
import { AnnotationPlugin, AnnotationPluginConfig } from "./plugin"
import { AnnotationState, initialState } from "./state"

// ***ID***
export const ANNOTATION_PLUGIN_ID = "annotation"

// ***MANIFEST***
const manifest: PluginManifest<AnnotationPluginConfig> = {
  id: ANNOTATION_PLUGIN_ID,
  name: "Annotation Plugin",
  version: "1.0.0",
  provides: ["annotation"],
  requires: ["interaction-manager", "selection"],
  optional: [],
  defaultConfig: {
    annotationAuthor: "test",
    deactivateToolAfterCreate: false,
    selectAfterCreate: true,
  },
}

// ***PLUGIN PACKAGE***
export const AnnotationPluginPackage: PluginPackage<
  AnnotationPlugin,
  AnnotationPluginConfig,
  AnnotationState,
  AnnotationAction
> = {
  manifest,
  create: (registry, config) => new AnnotationPlugin(ANNOTATION_PLUGIN_ID, registry, config),
  reducer,
  initialState,
}
