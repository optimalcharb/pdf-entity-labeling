import { JSX } from "react"
import { Rect } from "@embedpdf/models"
import type { MenuWrapperProps } from "@embedpdf/utils/react"
import type { TrackedAnnotation } from "../lib"

export interface SelectionMenuProps {
  annotation: TrackedAnnotation
  selected: boolean
  rect: Rect
  menuWrapperProps: MenuWrapperProps
}

export type SelectionMenu = (props: SelectionMenuProps) => JSX.Element | null
