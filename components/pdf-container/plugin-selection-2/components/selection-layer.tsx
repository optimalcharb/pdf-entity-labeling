import { Fragment } from "react"
import { Rotation } from "@embedpdf/models"
import { MarqueeSelectionStyle, TextSelectionStyle } from "../lib"
import { MarqueeSelection } from "./marquee-selection"
import { TextSelection } from "./text-selection"
import { SelectionSelectionMenuRenderFn } from "./types"

type Props = {
  documentId: string
  pageIndex: number
  scale?: number
  rotation?: Rotation
  /**
   * @deprecated Use `textStyle.background` instead.
   */
  background?: string
  /** Styling options for text selection highlights */
  textStyle?: TextSelectionStyle
  /** Styling options for the marquee selection rectangle */
  marqueeStyle?: MarqueeSelectionStyle
  /** Optional CSS class applied to the marquee rectangle */
  marqueeClassName?: string
  selectionMenu?: SelectionSelectionMenuRenderFn
}

/**
 * SelectionLayer is a convenience component that composes both text selection
 * and marquee selection on a single page.
 *
 * For advanced use cases, you can use `TextSelection` and `MarqueeSelection`
 * individually.
 */
export function SelectionLayer({
  documentId,
  pageIndex,
  scale,
  rotation,
  background,
  textStyle,
  marqueeStyle,
  marqueeClassName,
  selectionMenu,
}: Props) {
  return (
    <Fragment>
      <TextSelection
        documentId={documentId}
        pageIndex={pageIndex}
        scale={scale}
        rotation={rotation}
        background={textStyle?.background ?? background}
        selectionMenu={selectionMenu}
      />
      <MarqueeSelection
        documentId={documentId}
        pageIndex={pageIndex}
        scale={scale}
        background={marqueeStyle?.background}
        borderColor={marqueeStyle?.borderColor}
        borderStyle={marqueeStyle?.borderStyle}
        className={marqueeClassName}
      />
    </Fragment>
  )
}
