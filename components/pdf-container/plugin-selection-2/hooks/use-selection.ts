import { useCapability, usePlugin } from "@embedpdf/core/react"
import { SelectionPlugin } from "../lib"

export const useSelectionCapability = () => useCapability<SelectionPlugin>(SelectionPlugin.id)
export const useSelectionPlugin = () => usePlugin<SelectionPlugin>(SelectionPlugin.id)
