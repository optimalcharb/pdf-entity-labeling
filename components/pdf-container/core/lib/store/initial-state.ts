import { PdfDocumentObject, PdfPageObject, Rotation } from "../../models"
import { PluginRegistryConfig } from "../types/plugin"

export interface CoreState {
  scale: number
  rotation: Rotation
  document: PdfDocumentObject | null
  pages: PdfPageObject[][]
  loading: boolean
  error: string | null
}

export const initialCoreState: (config?: PluginRegistryConfig) => CoreState = (config) => ({
  scale: config?.scale ?? 1,
  rotation: config?.rotation ?? Rotation.Degree0,
  document: null,
  pages: [],
  loading: false,
  error: null,
})
