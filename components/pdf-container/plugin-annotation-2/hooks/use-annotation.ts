import { useCapability, usePlugin } from "@embedpdf/core/react"
import { useEffect, useState } from "react"
import { AnnotationPlugin, AnnotationState } from "../lib"
import { initialState } from "../lib/state"

export const useAnnotationPlugin = () => usePlugin<AnnotationPlugin>(AnnotationPlugin.id)
export const useAnnotationCapability = () => useCapability<AnnotationPlugin>(AnnotationPlugin.id)

export const useAnnotation = () => {
  const { provides } = useAnnotationCapability()
  const [state, setState] = useState<AnnotationState>(initialState)

  useEffect(() => {
    return provides?.onStateChange((action) => {
      setState(action)
    })
  }, [provides])

  return {
    state,
    provides,
  }
}
