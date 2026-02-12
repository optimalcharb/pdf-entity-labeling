import { MouseEvent, TouchEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useDocumentState } from "@embedpdf/core/react"
import { blendModeToCss, PdfAnnotationSubtype, PdfBlendMode } from "@embedpdf/models"
import { PointerEventHandlers, usePointerHandlers } from "../../plugin-interaction-manager-2"
import { useSelectionCapability } from "../../plugin-selection-2"
import { useAnnotationCapability } from "../hooks"
import type { AnnotationDocumentState, AnnotationState } from "../lib"
import type { PdfTextMarkupAnnotationObject } from "../lib/pdf-text-markup-annotation-object"
import { AnnotationContainter } from "./annotation-container"
import { Highlight } from "./text-markup/highlight"
import { Squiggly } from "./text-markup/squiggly"
import { Strikeout } from "./text-markup/strikeout"
import { Underline } from "./text-markup/underline"

const getAnnotationsByPageIndex = (docState: AnnotationDocumentState | undefined, page: number) =>
  !docState
    ? []
    : (docState.byPage[page] ?? [])
        .map((uid) => docState.byUid[uid])
        .filter((a): a is PdfTextMarkupAnnotationObject => !!a)

const getSelectedAnnotationByPageIndex = (
  s: AnnotationState,
  docState: AnnotationDocumentState | undefined,
  pageIndex: number,
): PdfTextMarkupAnnotationObject | null => {
  if (!s.selectedUid || !docState) return null
  const pageUids = docState.byPage[pageIndex] ?? []
  if (pageUids.includes(s.selectedUid)) {
    return docState.byUid[s.selectedUid] ?? null
  }
  return null
}

interface AnnotationsProps {
  documentId: string
  pageIndex: number
  selectionOutlineColor?: string
}

export function Annotations(annotationsProps: AnnotationsProps) {
  const { documentId, pageIndex } = annotationsProps
  const documentState = useDocumentState(documentId)
  const page = documentState?.document?.pages?.[pageIndex]
  const scale = documentState?.scale ?? 1
  const rotation = page?.rotation ?? 0
  const { provides: annotationProvides } = useAnnotationCapability()
  const { provides: selectionProvides } = useSelectionCapability()
  const [annotations, setAnnotations] = useState<PdfTextMarkupAnnotationObject[]>([])
  const { register } = usePointerHandlers({ documentId, pageIndex })
  const [selectionState, setSelectionState] = useState<PdfTextMarkupAnnotationObject | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (annotationProvides) {
      annotationProvides.onStateChange((state) => {
        const docState = state.activeDocumentId
          ? state.documents[state.activeDocumentId]
          : undefined
        setAnnotations(getAnnotationsByPageIndex(docState, pageIndex))
        setSelectionState(getSelectedAnnotationByPageIndex(state, docState, pageIndex))
      })
    }
  }, [annotationProvides, pageIndex])

  const handlers = useMemo(
    () => ({
      onPointerDown: (_: any, pe: any) => {
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
    (e: MouseEvent | TouchEvent, annotation: PdfTextMarkupAnnotationObject) => {
      e.stopPropagation()
      if (annotationProvides && selectionProvides) {
        annotationProvides.selectAnnotation(annotation.id)
        selectionProvides.clear()
        if (annotation.id !== editingId) {
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
        const isSelected = selectionState?.id === annotation.id

        if (annotation.type === PdfAnnotationSubtype.UNDERLINE) {
          return (
            <AnnotationContainter
              key={annotation.id}
              documentId={documentId}
              pageIndex={pageIndex}
              annotation={annotation}
              isSelected={isSelected}
              onSelect={(e) => handleClick(e, annotation)}
              zIndex={0}
              style={{
                mixBlendMode: blendModeToCss(annotation.blendMode ?? PdfBlendMode.Normal),
              }}
            >
              {(obj) => (
                <Underline {...obj} scale={scale} onClick={(e) => handleClick(e, annotation)} />
              )}
            </AnnotationContainter>
          )
        }

        if (annotation.type === PdfAnnotationSubtype.STRIKEOUT) {
          return (
            <AnnotationContainter
              key={annotation.id}
              documentId={documentId}
              pageIndex={pageIndex}
              annotation={annotation}
              isSelected={isSelected}
              onSelect={(e) => handleClick(e, annotation)}
              zIndex={0}
              style={{
                mixBlendMode: blendModeToCss(annotation.blendMode ?? PdfBlendMode.Normal),
              }}
            >
              {(obj) => (
                <Strikeout {...obj} scale={scale} onClick={(e) => handleClick(e, annotation)} />
              )}
            </AnnotationContainter>
          )
        }

        if (annotation.type === PdfAnnotationSubtype.SQUIGGLY) {
          return (
            <AnnotationContainter
              key={annotation.id}
              documentId={documentId}
              pageIndex={pageIndex}
              annotation={annotation}
              isSelected={isSelected}
              onSelect={(e) => handleClick(e, annotation)}
              zIndex={0}
              style={{
                mixBlendMode: blendModeToCss(annotation.blendMode ?? PdfBlendMode.Normal),
              }}
            >
              {(obj) => (
                <Squiggly {...obj} scale={scale} onClick={(e) => handleClick(e, annotation)} />
              )}
            </AnnotationContainter>
          )
        }

        if (annotation.type === PdfAnnotationSubtype.HIGHLIGHT) {
          return (
            <AnnotationContainter
              key={annotation.id}
              documentId={documentId}
              pageIndex={pageIndex}
              annotation={annotation}
              isSelected={isSelected}
              onSelect={(e) => handleClick(e, annotation)}
              zIndex={0}
              style={{
                mixBlendMode: blendModeToCss(annotation.blendMode ?? PdfBlendMode.Multiply),
              }}
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