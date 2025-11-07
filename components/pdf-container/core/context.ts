import { createContext } from "react"
import type { PluginRegistry } from "./lib"

export interface PDFContextState {
  registry: PluginRegistry | null
  isInitializing: boolean
  pluginsReady: boolean
}

export const PDFContext = createContext<PDFContextState>({
  registry: null,
  isInitializing: true,
  pluginsReady: false,
})
