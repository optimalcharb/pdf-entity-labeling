import { useEffect, useState } from "react"
import { Rect } from "@embedpdf/models"
import { useSelectionPlugin } from "../hooks"

type Props = {
  pageIndex: number
  scale: number
  background?: string
}

export function SelectionLayer({ pageIndex, scale, background = "rgba(33,150,243)" }: Props) {
  const { plugin: selPlugin } = useSelectionPlugin()
  const [rects, setRects] = useState<Rect[]>([])
  const [boundingRect, setBoundingRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!selPlugin) return

    return selPlugin.registerSelectionOnPage({
      pageIndex,
      onRectsChange: ({ rects, boundingRect }) => {
        setRects(rects)
        setBoundingRect(boundingRect)
      },
    })
  }, [selPlugin, pageIndex])

  if (!boundingRect) return null

  return (
    <div
      style={{
        position: "absolute",
        left: boundingRect.origin.x * scale,
        top: boundingRect.origin.y * scale,
        width: boundingRect.size.width * scale,
        height: boundingRect.size.height * scale,
        mixBlendMode: "multiply",
        isolation: "isolate",
      }}
    >
      {rects.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (b.origin.x - boundingRect.origin.x) * scale,
            top: (b.origin.y - boundingRect.origin.y) * scale,
            width: b.size.width * scale,
            height: b.size.height * scale,
            background,
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  )
}
