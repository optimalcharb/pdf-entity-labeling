import { CoreState } from "./initial-state"
import { transformSize, PdfPageObjectWithRotatedSize } from "../../models"

export const getPagesWithRotatedSize = (state: CoreState): PdfPageObjectWithRotatedSize[][] => {
  return state.pages.map((page) =>
    page.map((p) => ({
      ...p,
      rotatedSize: transformSize(p.size, state.rotation, 1),
    })),
  )
}
