import { useEffect, useState } from "react"
import { blendModeToCss, PdfAnnotationSubtype, PdfBlendMode, Rect } from "@embedpdf/models"
import { useSelectionCapability } from "../../../plugin-selection-2"
import { useAnnotationCapability } from "../../hooks"
import type { AnnotationTool } from "../../lib"
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
  const [activeTool, setActiveTool] = useState<AnnotationTool | null>(null)

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

    const off = annotationProvides.onActiveToolChange(setActiveTool)
    return off
  }, [annotationProvides])

  if (!boundingRect) return null
  if (!activeTool || !activeTool.defaults) return null

  switch (activeTool.defaults.type) {
    case PdfAnnotationSubtype.UNDERLINE:
      return (
        <div
          style={{
            mixBlendMode: blendModeToCss(activeTool.defaults?.blendMode ?? PdfBlendMode.Normal),
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
          }}
        >
          <Underline
            color={activeTool.defaults?.color}
            opacity={activeTool.defaults?.opacity}
            segmentRects={rects}
            scale={scale}
          />
        </div>
      )
    case PdfAnnotationSubtype.HIGHLIGHT:
      return (
        <div
          style={{
            mixBlendMode: blendModeToCss(activeTool.defaults?.blendMode ?? PdfBlendMode.Multiply),
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
          }}
        >
          <Highlight
            color={activeTool.defaults?.color}
            opacity={activeTool.defaults?.opacity}
            segmentRects={rects}
            scale={scale}
          />
        </div>
      )
    case PdfAnnotationSubtype.STRIKEOUT:
      return (
        <div
          style={{
            mixBlendMode: blendModeToCss(activeTool.defaults?.blendMode ?? PdfBlendMode.Normal),
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
          }}
        >
          <Strikeout
            color={activeTool.defaults?.color}
            opacity={activeTool.defaults?.opacity}
            segmentRects={rects}
            scale={scale}
          />
        </div>
      )
    case PdfAnnotationSubtype.SQUIGGLY:
      return (
        <div
          style={{
            mixBlendMode: blendModeToCss(activeTool.defaults?.blendMode ?? PdfBlendMode.Normal),
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
          }}
        >
          <Squiggly
            color={activeTool.defaults?.color}
            opacity={activeTool.defaults?.opacity}
            segmentRects={rects}
            scale={scale}
          />
        </div>
      )
    default:
      return null
  }
}
