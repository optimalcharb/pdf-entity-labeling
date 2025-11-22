import { useCapability } from "@embedpdf/core/preact"
import { UIPlugin } from "../ui-plugin"

export const useUICapability = () => useCapability<UIPlugin>(UIPlugin.id)
