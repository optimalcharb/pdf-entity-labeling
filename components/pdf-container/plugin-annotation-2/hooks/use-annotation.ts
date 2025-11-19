import { useCapability, usePlugin } from "@embedpdf/core/react"
import { AnnotationPlugin } from "../lib"

export const useAnnotationPlugin = () => usePlugin<AnnotationPlugin>(AnnotationPlugin.id)
export const useAnnotationCapability = () => useCapability<AnnotationPlugin>(AnnotationPlugin.id)
