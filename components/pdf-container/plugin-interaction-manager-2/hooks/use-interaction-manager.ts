import { useCapability } from "@embedpdf/core/react"
import { InteractionManagerPlugin } from "../lib"

export const useInteractionManagerCapability = () =>
  useCapability<InteractionManagerPlugin>(InteractionManagerPlugin.id)
