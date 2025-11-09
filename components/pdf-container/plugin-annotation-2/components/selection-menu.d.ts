import { Rect } from "@embedpdf/models"
import { MenuWrapperProps } from "@embedpdf/utils/react"
import { JSX } from "react"
import { TrackedAnnotation } from "../lib"

interface SelectionMenuProps {
  annotation: TrackedAnnotation
  selected: boolean
  rect: Rect
  menuWrapperProps: MenuWrapperProps
}

export type SelectionMenu = (props: SelectionMenuProps) => JSX.Element
