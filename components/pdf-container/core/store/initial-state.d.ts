import { PdfDocumentObject, PdfPageObject, Rotation } from "../models"
import { PluginRegistryConfig } from "../types"
export interface CoreState {
  scale: number
  rotation: Rotation
  document: PdfDocumentObject | null
  pages: PdfPageObject[][]
  loading: boolean
  error: string | null
}
export declare const initialCoreState: (config?: PluginRegistryConfig) => CoreState
