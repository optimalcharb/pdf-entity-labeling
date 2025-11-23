import { useCapability } from "@embedpdf/core/react"
import { LoaderPlugin } from "../lib"

export const useLoaderCapability = () => useCapability<LoaderPlugin>(LoaderPlugin.id)
