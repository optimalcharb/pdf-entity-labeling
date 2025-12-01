import { MouseEvent, TouchEvent, useCallback, useEffect, useMemo, useState } from "react"
import { blendModeToCss, PdfBlendMode } from "@embedpdf/models"
import { PointerEventHandlers, usePointerHandlers } from "../../plugin-interaction-manager-2"
import { useSelectionCapability } from "../../plugin-selection-2"
import { useAnnotationCapability } from "../hooks"
import type { AnnotationState, TrackedAnnotation } from "../lib"
import type { PdfTextMarkupAnnotationObject } from "../lib/pdf-text-markup-annotation-object"
import { isHighlight, isSquiggly, isStrikeout, isUnderline } from "../lib/subtype-predicates"
import { AnnotationContainter } from "./annotation-container"
import { Highlight } from "./text-markup/highlight"
import { Squiggly } from "./text-markup/squiggly"
import { Strikeout } from "./text-markup/strikeout"
import { Underline } from "./text-markup/underline"

const getAnnotationsByPageIndex = (s: AnnotationState, page: number) =>
  (s.byPage[page] ?? []).map(
    (uid) => s.byUid[uid],
  ) as TrackedAnnotation<PdfTextMarkupAnnotationObject>[]

const getSelectedAnnotationByPageIndex = (
  s: AnnotationState,
  pageIndex: number,
): TrackedAnnotation<PdfTextMarkupAnnotationObject> | null => {
  if (!s.selectedUid) return null
  const pageUids = s.byPage[pageIndex] ?? []
  if (pageUids.includes(s.selectedUid)) {
    return s.byUid[s.selectedUid] as TrackedAnnotation<PdfTextMarkupAnnotationObject>
  }
  return null
}

interface AnnotationsProps {
  pageIndex: number
  scale: number
  rotation: number
  pageWidth: number
  pageHeight: number
  selectionOutlineColor?: string
}

export function Annotations(annotationsProps: AnnotationsProps) {
  const { pageIndex, scale } = annotationsProps
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
  }, [annotationProvides, pageIndex])

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
        annotationProvides.selectAnnotation(annotation.object.id)
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
            <AnnotationContainter
              key={annotation.object.id}
              trackedAnnotation={annotation}
              isSelected={isSelected}
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
            </AnnotationContainter>
          )
        }

        if (isStrikeout(annotation)) {
          return (
            <AnnotationContainter
              key={annotation.object.id}
              trackedAnnotation={annotation}
              isSelected={isSelected}
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
            </AnnotationContainter>
          )
        }

        if (isSquiggly(annotation)) {
          return (
            <AnnotationContainter
              key={annotation.object.id}
              trackedAnnotation={annotation}
              isSelected={isSelected}
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
            </AnnotationContainter>
          )
        }

        if (isHighlight(annotation)) {
          return (
            <AnnotationContainter
              key={annotation.object.id}
              trackedAnnotation={annotation}
              isSelected={isSelected}
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
            </AnnotationContainter>
          )
        }

        return null
      })}
    </>
  )
}
