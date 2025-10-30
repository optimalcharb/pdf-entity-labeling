import { ReactNode } from "react"
import { Logger, PdfEngine } from "../models"
import { IPlugin, PDFContextState, PluginBatchRegistration, PluginRegistry } from "../types"
interface EmbedPDFProps {
  /**
   * The PDF engine to use for the PDF viewer.
   */
  engine: PdfEngine
  /**
   * The logger to use for the PDF viewer.
   */
  logger?: Logger
  /**
   * The callback to call when the PDF viewer is initialized.
   */
  onInitialized?: (registry: PluginRegistry) => Promise<void>
  /**
   * The plugins to use for the PDF viewer.
   */
  plugins: PluginBatchRegistration<IPlugin<any>, any>[]
  /**
   * The children to render for the PDF viewer.
   */
  children: ReactNode | ((state: PDFContextState) => ReactNode)
  /**
   * Whether to auto-mount specific non-visual DOM elements from plugins.
   * @default true
   */
  autoMountDomElements?: boolean
}
export declare function EmbedPDF({
  engine,
  logger,
  onInitialized,
  plugins,
  children,
  autoMountDomElements,
}: EmbedPDFProps): import("react/jsx-runtime").JSX.Element
export {}
