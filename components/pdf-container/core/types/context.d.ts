import { PluginRegistry } from "./plugin-registry"

export interface PDFContextState {
  registry: PluginRegistry | null
  isInitializing: boolean
  pluginsReady: boolean
}

export declare const PDFContext: import("react").Context<PDFContextState>
