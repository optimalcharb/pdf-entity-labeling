import { useCapability } from "@embedpdf/core/react"
import { AnnotationPlugin } from "../lib"

export const useAnnotationCapability = () => useCapability<AnnotationPlugin>(AnnotationPlugin.id)
