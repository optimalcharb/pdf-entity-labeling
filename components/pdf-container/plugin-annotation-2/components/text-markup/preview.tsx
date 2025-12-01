import { useEffect, useState } from "react"
import { blendModeToCss, PdfAnnotationSubtype, PdfBlendMode, Rect } from "@embedpdf/models"
import { useSelectionCapability } from "../../../plugin-selection-2"
import { useAnnotationCapability } from "../../hooks"
import { Highlight } from "./highlight"
import { Squiggly } from "./squiggly"
import { Strikeout } from "./strikeout"
import { Underline } from "./underline"

interface TextMarkupPreviewProps {
  pageIndex: number
  scale: number
}

export function TextMarkupPreview({ pageIndex, scale }: TextMarkupPreviewProps) {
  const { provides: selectionProvides } = useSelectionCapability()
  const { provides: annotationProvides } = useAnnotationCapability()
  const [rects, setRects] = useState<Array<Rect>>([])
  const [boundingRect, setBoundingRect] = useState<Rect | null>(null)
  const [activeSubtype, setActiveSubtype] = useState<PdfAnnotationSubtype | null>(null)
  const [activeColor, setActiveColor] = useState<string>("red")
  const [activeOpacity, setActiveOpacity] = useState<number>(0.5)

  useEffect(() => {
    if (!selectionProvides) return

    const off = selectionProvides.onSelectionChange(() => {
      setRects(selectionProvides.getHighlightRectsForPage(pageIndex))
      setBoundingRect(selectionProvides.getBoundingRectForPage(pageIndex))
    })
    return off
  }, [selectionProvides, pageIndex])

  useEffect(() => {
    if (!annotationProvides) return

    const off = annotationProvides.onStateChange((state) => {
      setActiveSubtype(state.activeSubtype)
      setActiveColor(state.activeColor)
      setActiveOpacity(state.activeOpacity)
    })
    return off
  }, [annotationProvides])

  if (!boundingRect) return null
  if (!activeSubtype) return null

  switch (activeSubtype) {
    case PdfAnnotationSubtype.UNDERLINE:
      return (
        <div
          style={{
            mixBlendMode: blendModeToCss(PdfBlendMode.Normal),
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
          }}
        >
          <Underline
            color={activeColor}
            opacity={activeOpacity}
            segmentRects={rects}
            scale={scale}
          />
        </div>
      )
    case PdfAnnotationSubtype.HIGHLIGHT:
      return (
        <div
          style={{
            mixBlendMode: blendModeToCss(PdfBlendMode.Multiply),
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
          }}
        >
          <Highlight
            color={activeColor}
            opacity={activeOpacity}
            segmentRects={rects}
            scale={scale}
          />
        </div>
      )
    case PdfAnnotationSubtype.STRIKEOUT:
      return (
        <div
          style={{
            mixBlendMode: blendModeToCss(PdfBlendMode.Normal),
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
          }}
        >
          <Strikeout
            color={activeColor}
            opacity={activeOpacity}
            segmentRects={rects}
            scale={scale}
          />
        </div>
      )
    case PdfAnnotationSubtype.SQUIGGLY:
      return (
        <div
          style={{
            mixBlendMode: blendModeToCss(PdfBlendMode.Normal),
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
          }}
        >
          <Squiggly
            color={activeColor}
            opacity={activeOpacity}
            segmentRects={rects}
            scale={scale}
          />
        </div>
      )
    default:
      return null
  }
}
