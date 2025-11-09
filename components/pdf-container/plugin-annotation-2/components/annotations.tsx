import { blendModeToCss, PdfBlendMode } from "@embedpdf/models"
import { PointerEventHandlers } from "@embedpdf/plugin-interaction-manager"
import { usePointerHandlers } from "@embedpdf/plugin-interaction-manager/react"
import { useSelectionCapability } from "@embedpdf/plugin-selection/react"
import { MouseEvent, TouchEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useAnnotationCapability } from "../hooks"
import {
  getAnnotationsByPageIndex,
  getSelectedAnnotationByPageIndex,
  TrackedAnnotation,
} from "../lib"
import { isHighlight, isSquiggly, isStrikeout, isUnderline } from "../lib/subtype-predicates"
import { AnnotationOutline } from "./annotation-outline"
import { SelectionMenu } from "./selection-menu"
import { Highlight } from "./text-markup/highlight"
import { Squiggly } from "./text-markup/squiggly"
import { Strikeout } from "./text-markup/strikeout"
import { Underline } from "./text-markup/underline"

interface AnnotationsProps {
  pageIndex: number
  scale: number
  rotation: number
  pageWidth: number
  pageHeight: number
  selectionMenu?: SelectionMenu
  selectionOutlineColor?: string
}

export function Annotations(annotationsProps: AnnotationsProps) {
  const { pageIndex, scale, selectionMenu } = annotationsProps
  const { provides: annotationProvides } = useAnnotationCapability()
  const { provides: selectionProvides } = useSelectionCapability()
  const [annotations, setAnnotations] = useState<TrackedAnnotation[]>([])
  const { register } = usePointerHandlers({ pageIndex })
  const [selectionState, setSelectionState] = useState<TrackedAnnotation | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (annotationProvides) {
      annotationProvides.onStateChange((state) => {
        setAnnotations(getAnnotationsByPageIndex(state, pageIndex))
        setSelectionState(getSelectedAnnotationByPageIndex(state, pageIndex))
      })
    }
  }, [annotationProvides])

  const handlers = useMemo(
    (): PointerEventHandlers<MouseEvent> => ({
      onPointerDown: (_, pe) => {
        // Only deselect if clicking directly on the layer (not on an annotation)
        if (pe.target === pe.currentTarget && annotationProvides) {
          annotationProvides.deselectAnnotation()
          setEditingId(null)
        }
      },
    }),
    [annotationProvides],
  )

  const handleClick = useCallback(
    (e: MouseEvent | TouchEvent, annotation: TrackedAnnotation) => {
      e.stopPropagation()
      if (annotationProvides && selectionProvides) {
        annotationProvides.selectAnnotation(pageIndex, annotation.object.id)
        selectionProvides.clear()
        if (annotation.object.id !== editingId) {
          setEditingId(null)
        }
      }
    },
    [annotationProvides, selectionProvides, editingId, pageIndex],
  )

  useEffect(() => {
    return register(handlers)
  }, [register, handlers])

  return (
    <>
      {annotations.map((annotation) => {
        const isSelected = selectionState?.object.id === annotation.object.id

        if (isUnderline(annotation)) {
          return (
            <AnnotationOutline
              key={annotation.object.id}
              trackedAnnotation={annotation}
              isSelected={isSelected}
              selectionMenu={selectionMenu}
              onSelect={(e) => handleClick(e, annotation)}
              zIndex={0}
              style={{
                mixBlendMode: blendModeToCss(annotation.object.blendMode ?? PdfBlendMode.Normal),
              }}
              {...annotationsProps}
            >
              {(obj) => (
                <Underline {...obj} scale={scale} onClick={(e) => handleClick(e, annotation)} />
              )}
            </AnnotationOutline>
          )
        }

        if (isStrikeout(annotation)) {
          return (
            <AnnotationOutline
              key={annotation.object.id}
              trackedAnnotation={annotation}
              isSelected={isSelected}
              selectionMenu={selectionMenu}
              onSelect={(e) => handleClick(e, annotation)}
              zIndex={0}
              style={{
                mixBlendMode: blendModeToCss(annotation.object.blendMode ?? PdfBlendMode.Normal),
              }}
              {...annotationsProps}
            >
              {(obj) => (
                <Strikeout {...obj} scale={scale} onClick={(e) => handleClick(e, annotation)} />
              )}
            </AnnotationOutline>
          )
        }

        if (isSquiggly(annotation)) {
          return (
            <AnnotationOutline
              key={annotation.object.id}
              trackedAnnotation={annotation}
              isSelected={isSelected}
              selectionMenu={selectionMenu}
              onSelect={(e) => handleClick(e, annotation)}
              zIndex={0}
              style={{
                mixBlendMode: blendModeToCss(annotation.object.blendMode ?? PdfBlendMode.Normal),
              }}
              {...annotationsProps}
            >
              {(obj) => (
                <Squiggly {...obj} scale={scale} onClick={(e) => handleClick(e, annotation)} />
              )}
            </AnnotationOutline>
          )
        }

        if (isHighlight(annotation)) {
          return (
            <AnnotationOutline
              key={annotation.object.id}
              trackedAnnotation={annotation}
              isSelected={isSelected}
              selectionMenu={selectionMenu}
              onSelect={(e) => handleClick(e, annotation)}
              zIndex={0}
              style={{
                mixBlendMode: blendModeToCss(annotation.object.blendMode ?? PdfBlendMode.Multiply),
              }}
              {...annotationsProps}
            >
              {(obj) => (
                <Highlight {...obj} scale={scale} onClick={(e) => handleClick(e, annotation)} />
              )}
            </AnnotationOutline>
          )
        }

        return null
      })}
    </>
  )
}
