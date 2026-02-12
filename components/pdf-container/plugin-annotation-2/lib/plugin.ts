import {
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  PluginRegistry,
} from "@embedpdf/core"
import {
  PdfAnnotationObject,
  PdfAnnotationSubtype,
  PdfErrorCode,
  PdfErrorReason,
  PdfTaskHelper,
  Task,
} from "@embedpdf/models"
import { uuidV4 } from "@/lib/misc/uuid"
import {
  InteractionManagerCapability,
  InteractionManagerPlugin,
} from "../../plugin-interaction-manager-2"
import { SelectionCapability, SelectionPlugin } from "../../plugin-selection-2"
import type { AnnotationAction } from "./actions"
import {
  cleanupAnnotationState,
  clearAnnotations,
  createAnnotation,
  deleteAnnotation,
  deselectAnnotation,
  initAnnotationState,
  patchAnnotation,
  selectAnnotation,
  setActiveDocument,
  setAnnotations,
  setCanUndoRedo,
  setCreateAnnotationDefaults,
} from "./actions"
import type { Command } from "./custom-types"
import type { PdfTextMarkupAnnotationObject } from "./pdf-text-markup-annotation-object"
import type { AnnotationDocumentState, AnnotationState } from "./state"
import { initialDocumentState, Subtype, subtypeToEnum } from "./state"

function ignore() {}

// ***PLUGIN CONFIG***
export interface AnnotationPluginConfig extends BasePluginConfig {
  author?: string
  deactivateSubtypeAfterCreate?: boolean
  selectAfterCreate?: boolean
}

// ***PLUGIN CAPABILITY***
export interface AnnotationCapability {
  onStateChange: (listener: (state: AnnotationState) => void) => () => void
  // getPageAnnotations uses PDFium to get any annotations saved in the PDF, even those not made by this plugin
  getPageAnnotations: (options: {
    pageIndex: number
  }) => Task<PdfAnnotationObject[], PdfErrorReason>

  selectAnnotation: (annotationId: string) => void
  deselectAnnotation: () => void

  setCreateAnnotationDefaults: (defaults: {
    color?: string
    opacity?: number
    subtype?: Subtype | null
    entityType?: string
  }) => void

  exportAnnotationsToJSON: () => void // temp for testing
  createAnnotation: (annotation: PdfTextMarkupAnnotationObject) => void // for user-created annotations
  createAnnotations: (items: PdfTextMarkupAnnotationObject[]) => void // for consumer program to batch create annotations (without adding to timeline)
  deleteAnnotation: (annotationId: string) => void
  deleteAnnotations: (annotationIds: string[]) => void // for consumer program to batch delete annotations (without adding to timeline)
  updateAnnotation: (annotationId: string, patch: Partial<PdfTextMarkupAnnotationObject>) => void // change the props of an annotation
  updateAnnotations: (
    items: { id: string; patch: Partial<PdfTextMarkupAnnotationObject> }[],
  ) => void // for consumer program to batch update annotations (without adding to timeline)
  clearAnnotations: () => void // clear all annotations
  undo: () => void
  redo: () => void
}

// ***PLUGIN CLASS***
export class AnnotationPlugin extends BasePlugin<
  AnnotationPluginConfig,
  AnnotationCapability,
  AnnotationState,
  AnnotationAction
> {
  static readonly id = "annotation" as const

  public readonly config: AnnotationPluginConfig
  private readonly state$ = createBehaviorEmitter<AnnotationState>()
  private readonly interactionManager: InteractionManagerCapability | null
  private readonly selection: SelectionCapability | null

  private isInitialLoadComplete: Record<string, boolean> = {}
  private loadingQueues: Record<string, PdfTextMarkupAnnotationObject[]> = {}

  private timelines: Record<string, Command[]> = {}
  private timelineIndices: Record<string, number> = {}

  constructor(id: string, registry: PluginRegistry, config: AnnotationPluginConfig) {
    super(id, registry)
    this.config = config

    this.selection = registry.getPlugin<SelectionPlugin>("selection")?.provides() ?? null
    this.interactionManager =
      registry.getPlugin<InteractionManagerPlugin>("interaction-manager")?.provides() ?? null
  }

  async initialize(): Promise<void> {
    // Register a single interaction mode for annotations
    this.interactionManager?.registerMode({
      id: "annotation",
      scope: "page",
      exclusive: false,
      cursor: "text",
    })
    this.selection?.enableForMode("annotation")

    this.selection?.onEndSelection(() => {
      const { activeSubtype, activeColor, activeOpacity, activeEntityType } = this.state
      if (!activeSubtype) return

      const formattedSelection = this.selection?.getFormattedSelection()
      const selectionText = this.selection?.getSelectedText()
      if (!formattedSelection || !selectionText) return

      for (const selection of formattedSelection) {
        selectionText.wait((text) => {
          const annotationId = uuidV4()
          // Create an annotation using the active state properties
          this.createAnnotation({
            type: subtypeToEnum(activeSubtype),
            color: activeColor,
            opacity: activeOpacity,
            rect: selection.rect,
            segmentRects: selection.segmentRects,
            pageIndex: selection.pageIndex,
            id: annotationId,
            contents: text.join("\n"),
            custom: {
              entityType: activeEntityType,
            },
          } as PdfTextMarkupAnnotationObject)

          if (this.config.deactivateSubtypeAfterCreate) {
            this.dispatch(setCreateAnnotationDefaults({ subtype: null, entityType: "" }))
          }
          if (this.config.selectAfterCreate) {
            this.dispatch(selectAnnotation(annotationId))
          }
        }, ignore)
      }

      this.selection?.clear()
    })
  }

  // ***DOCUMENT LIFECYCLE HOOKS***
  protected override onDocumentLoadingStarted(documentId: string): void {
    // Initialize annotation state for this document
    const docState = { ...initialDocumentState }
    this.dispatch(initAnnotationState(documentId, docState))

    // Initialize document-specific tracking
    this.isInitialLoadComplete[documentId] = false
    this.loadingQueues[documentId] = []
    this.timelines[documentId] = []
    this.timelineIndices[documentId] = -1
  }

  protected override onDocumentLoaded(documentId: string): void {
    // Set as active document and load existing annotations
    this.dispatch(setActiveDocument(documentId))
    this.getAllAnnotations(documentId)
  }

  protected override onDocumentClosed(documentId: string): void {
    // Clean up document state
    this.dispatch(cleanupAnnotationState(documentId))

    // Clean up document-specific tracking
    delete this.isInitialLoadComplete[documentId]
    delete this.loadingQueues[documentId]
    delete this.timelines[documentId]
    delete this.timelineIndices[documentId]
  }

  private getDocumentState(documentId?: string): AnnotationDocumentState | null {
    const id = documentId ?? this.getActiveDocumentId()
    return this.state.documents[id] ?? null
  }

  protected buildCapability(): AnnotationCapability {
    return {
      onStateChange: this.state$.on,
      getPageAnnotations: (options) => this.getPageAnnotations(options),
      selectAnnotation: (id) => this.dispatch(selectAnnotation(id)),
      deselectAnnotation: () => this.dispatch(deselectAnnotation()),
      setCreateAnnotationDefaults: (defaults) =>
        this.dispatch(setCreateAnnotationDefaults(defaults)),
      createAnnotations: (items) => this.createAnnotations(items),
      createAnnotation: (anno) => this.createAnnotation(anno),
      deleteAnnotation: (id) => this.deleteAnnotation(id),
      deleteAnnotations: (ids) => this.deleteAnnotations(ids),
      updateAnnotation: (id, patch) => this.updateAnnotation(id, patch),
      updateAnnotations: (items) => this.updateAnnotations(items),
      clearAnnotations: () => this.clearAllAnnotations(),
      exportAnnotationsToJSON: () => this.exportAnnotationsToJSON(),
      undo: () => {
        const documentId = this.getActiveDocumentId()
        if (!documentId) return

        const timelineIndex = this.timelineIndices[documentId] ?? -1
        const timeline = this.timelines[documentId] ?? []

        if (timelineIndex > -1) {
          const command = timeline[timelineIndex]
          command?.undo()
          this.timelineIndices[documentId] = timelineIndex - 1
          this.dispatch(setCanUndoRedo(this.timelineIndices[documentId], timeline.length))
        }
      },
      redo: () => {
        const documentId = this.getActiveDocumentId()
        if (!documentId) return

        const timelineIndex = this.timelineIndices[documentId] ?? -1
        const timeline = this.timelines[documentId] ?? []

        if (timelineIndex < timeline.length - 1) {
          this.timelineIndices[documentId] = timelineIndex + 1
          const command = timeline[this.timelineIndices[documentId]]
          command?.execute()
          this.dispatch(setCanUndoRedo(this.timelineIndices[documentId], timeline.length))
        }
      },
    }
  }

  override onStoreUpdated(prev: AnnotationState, next: AnnotationState): void {
    this.state$.emit(next)

    // Update undo/redo state when active document changes
    if (prev.activeDocumentId !== next.activeDocumentId && next.activeDocumentId) {
      const documentId = next.activeDocumentId
      const timelineIndex = this.timelineIndices[documentId] ?? -1
      const timeline = this.timelines[documentId] ?? []
      this.dispatch(setCanUndoRedo(timelineIndex, timeline.length))
    }

    // Change interaction mode when activeSubtype changes between null and non-null
    if (!prev.activeSubtype || !next.activeSubtype) {
      if (next.activeSubtype) {
        this.interactionManager?.activate("annotation")
      } else {
        this.interactionManager?.activateDefaultMode()
      }
    }
  }

  private getAllAnnotations(documentId: string) {
    const doc = this.getDocumentState(documentId)
    if (!doc) return

    const task = this.engine.getAllAnnotations(doc)
    task.wait((annotations) => {
      /**
       * annotations is Record<number, PdfAnnotationObject[]>
       * textMarkupAnnotations is filtered to only PdfTextMarkupAnnotationObjects
       * other annotation types are not rendered
       */
      const textMarkupAnnotations: Record<number, PdfTextMarkupAnnotationObject[]> = {}

      for (const pageIndex in annotations) {
        const pageIndexNum = Number(pageIndex)
        const pageAnnotations = annotations[pageIndexNum]
        if (!pageAnnotations) continue
        const textMarkupPageAnnotations: PdfTextMarkupAnnotationObject[] = []

        for (const annotation of pageAnnotations) {
          if (
            annotation.type === PdfAnnotationSubtype.HIGHLIGHT ||
            annotation.type === PdfAnnotationSubtype.UNDERLINE ||
            annotation.type === PdfAnnotationSubtype.SQUIGGLY ||
            annotation.type === PdfAnnotationSubtype.STRIKEOUT
          ) {
            textMarkupPageAnnotations.push(annotation as PdfTextMarkupAnnotationObject)
          }
        }

        textMarkupAnnotations[pageIndexNum] = textMarkupPageAnnotations
      }

      this.dispatch(setAnnotations(documentId, textMarkupAnnotations))

      const loadingQueue = this.loadingQueues[documentId] ?? []
      if (loadingQueue.length > 0) {
        this.createQueuedAnnotations(documentId)
      }

      this.isInitialLoadComplete[documentId] = true
    }, ignore)
  }

  private getPageAnnotations(options: {
    pageIndex: number
  }): Task<PdfAnnotationObject[], PdfErrorReason> {
    const { pageIndex } = options
    const documentId = this.getActiveDocumentId()

    if (!documentId) {
      return PdfTaskHelper.reject({ code: PdfErrorCode.NotFound, message: "No active document" })
    }

    const doc = this.getDocumentState(documentId)

    if (!doc) {
      return PdfTaskHelper.reject({ code: PdfErrorCode.NotFound, message: "Document not found" })
    }

    const page = doc.pages.find((p) => p.index === pageIndex)

    if (!page) {
      return PdfTaskHelper.reject({ code: PdfErrorCode.NotFound, message: "Page not found" })
    }

    return this.engine.getPageAnnotations(doc, page)
  }

  // consumer capability to batch add annotations
  private createAnnotations(items: PdfTextMarkupAnnotationObject[]) {
    const documentId = this.getActiveDocumentId()
    if (!documentId || !items.length) return

    if (!this.isInitialLoadComplete[documentId]) {
      const queue = this.loadingQueues[documentId] ?? []
      queue.push(...items)
      this.loadingQueues[documentId] = queue
      return
    }
    this.batchCreateAnnotations(documentId, items)
  }

  // consumer capability to batch update annotations
  private updateAnnotations(
    items: { id: string; patch: Partial<PdfTextMarkupAnnotationObject> }[],
  ) {
    const documentId = this.getActiveDocumentId()
    if (!documentId || !items.length) return

    const doc = this.getDocumentState(documentId)
    const docState = this.state.documents[documentId]
    if (!doc || !docState) return

    for (const { id, patch } of items) {
      const annotation = docState.byUid[id]
      if (!annotation) continue

      patch.modified = new Date()
      patch.author = patch.author ?? this.config.author
      this.dispatch(patchAnnotation(documentId, id, patch))

      const updatedAnnotation = { ...annotation, ...patch }
      const page = doc.pages.find((p) => p.index === annotation.pageIndex)
      if (page) {
        this.engine.updatePageAnnotation!(doc, page, updatedAnnotation)
      }
    }
  }

  // consumer capability to batch delete annotations
  private deleteAnnotations(annotationIds: string[]) {
    const documentId = this.getActiveDocumentId()
    if (!documentId || !annotationIds.length) return

    const doc = this.getDocumentState(documentId)
    const docState = this.state.documents[documentId]
    if (!doc || !docState) return

    for (const id of annotationIds) {
      const annotation = docState.byUid[id]
      if (!annotation) continue

      this.dispatch(deleteAnnotation(documentId, id))

      const page = doc.pages.find((p) => p.index === annotation.pageIndex)
      if (page) {
        this.engine.removePageAnnotation!(doc, page, annotation)
      }
    }
  }

  // internal process to load annotations existing in a PDF
  private createQueuedAnnotations(documentId: string) {
    const queue = this.loadingQueues[documentId] ?? []
    if (queue.length === 0) return
    const items = [...queue]
    this.loadingQueues[documentId] = []
    this.batchCreateAnnotations(documentId, items)
  }

  // batchCreate has no undo capability since it is used by consumer programs, not users
  private batchCreateAnnotations(documentId: string, items: PdfTextMarkupAnnotationObject[]) {
    const doc = this.getDocumentState(documentId)
    if (!doc) return

    for (const annotation of items) {
      annotation.created = new Date()
      annotation.author = annotation.author ?? this.config.author
      this.dispatch(createAnnotation(documentId, annotation))

      const page = doc.pages.find((p) => p.index === annotation.pageIndex)
      if (page) {
        this.engine.createPageAnnotation!(doc, page, annotation)
      }
    }
  }

  private createAnnotation(annotation: PdfTextMarkupAnnotationObject) {
    const documentId = this.getActiveDocumentId()
    if (!documentId) return

    const id = annotation.id
    const pageIndex = annotation.pageIndex
    const annotationModified = {
      ...annotation,
      created: new Date(),
      author: annotation.author ?? this.config.author,
    }

    const execute = () => {
      this.dispatch(createAnnotation(documentId, annotationModified))

      // Execute PDFium operation immediately
      const doc = this.getDocumentState(documentId)
      if (doc) {
        const page = doc.pages.find((p) => p.index === pageIndex)
        if (page) {
          this.engine.createPageAnnotation!(doc, page, annotationModified)
        }
      }
    }

    const command: Command = {
      execute,
      undo: () => {
        if (this.state.selectedUid === id) this.dispatch(deselectAnnotation())
        this.dispatch(deleteAnnotation(documentId, id))

        // Execute PDFium delete operation immediately
        const doc = this.getDocumentState(documentId)
        if (doc) {
          const page = doc.pages.find((p) => p.index === pageIndex)
          if (page) {
            this.engine.removePageAnnotation!(doc, page, annotationModified)
          }
        }
      },
    }
    this.executeWithTimeline(documentId, command)
  }

  private deleteAnnotation(id: string) {
    const documentId = this.getActiveDocumentId()
    if (!documentId) return

    const docState = this.state.documents[documentId]
    if (!docState) return

    const originalAnnotation = docState.byUid[id]
    if (!originalAnnotation) return

    const execute = () => {
      if (this.state.selectedUid === id) this.dispatch(deselectAnnotation())
      this.dispatch(deleteAnnotation(documentId, id))

      // Execute PDFium operation immediately
      const doc = this.getDocumentState(documentId)
      if (doc) {
        const page = doc.pages.find((p) => p.index === originalAnnotation.pageIndex)
        if (page) {
          this.engine.removePageAnnotation!(doc, page, originalAnnotation)
        }
      }
    }

    const command: Command = {
      execute,
      undo: () => {
        this.dispatch(createAnnotation(documentId, originalAnnotation))

        // Execute PDFium create operation immediately for undo
        const doc = this.getDocumentState(documentId)
        if (doc) {
          const page = doc.pages.find((p) => p.index === originalAnnotation.pageIndex)
          if (page) {
            this.engine.createPageAnnotation!(doc, page, originalAnnotation)
          }
        }
      },
    }
    this.executeWithTimeline(documentId, command)
  }

  private updateAnnotation(id: string, patch: Partial<PdfTextMarkupAnnotationObject>) {
    const documentId = this.getActiveDocumentId()
    if (!documentId) return

    const docState = this.state.documents[documentId]
    if (!docState) return

    const originalAnnotation = docState.byUid[id]
    if (!originalAnnotation) return
    if (patch.id !== id) patch.id = id // id is immutable
    const patchModified = {
      ...patch,
      modified: new Date(),
      author: patch.author ?? this.config.author,
    }

    const execute = () => {
      this.dispatch(patchAnnotation(documentId, id, patchModified))

      // Execute PDFium operation immediately
      const doc = this.getDocumentState(documentId)
      if (doc) {
        const updatedAnnotation = { ...originalAnnotation, ...patchModified }
        const page = doc.pages.find((p) => p.index === originalAnnotation.pageIndex)
        if (page) {
          this.engine.updatePageAnnotation!(doc, page, updatedAnnotation)
        }
      }
    }

    const undoPatch = Object.fromEntries(
      Object.keys(patch).map((key) => [
        key,
        originalAnnotation[key as keyof PdfTextMarkupAnnotationObject],
      ]),
    )
    const command: Command = {
      execute,
      undo: () => {
        this.dispatch(patchAnnotation(documentId, id, undoPatch))

        // Execute PDFium operation immediately for undo
        const doc = this.getDocumentState(documentId)
        if (doc) {
          const page = doc.pages.find((p) => p.index === originalAnnotation.pageIndex)
          if (page) {
            this.engine.updatePageAnnotation!(doc, page, originalAnnotation)
          }
        }
      },
    }
    this.executeWithTimeline(documentId, command)
  }

  private clearAllAnnotations() {
    const documentId = this.getActiveDocumentId()
    if (!documentId) return

    const docState = this.state.documents[documentId]
    if (!docState) return

    const previousAnnotations: Record<number, PdfTextMarkupAnnotationObject[]> = {}
    Object.entries(docState.byPage).forEach(([pageIndex, uids]) => {
      const pageAnnos = uids
        .map((uid) => docState.byUid[uid])
        .filter((a): a is PdfTextMarkupAnnotationObject => !!a)
      if (pageAnnos.length > 0) {
        previousAnnotations[Number(pageIndex)] = pageAnnos
      }
    })

    const command: Command = {
      execute: () => {
        this.dispatch(clearAnnotations(documentId))

        // Execute PDFium operations immediately
        const doc = this.getDocumentState(documentId)
        if (doc) {
          Object.values(previousAnnotations)
            .flat()
            .forEach((annotation) => {
              const page = doc.pages.find((p) => p.index === annotation.pageIndex)
              if (page) {
                this.engine.removePageAnnotation!(doc, page, annotation)
              }
            })
        }
      },
      undo: () => {
        this.dispatch(setAnnotations(documentId, previousAnnotations))

        // Execute PDFium operations immediately for undo
        const doc = this.getDocumentState(documentId)
        if (doc) {
          Object.values(previousAnnotations)
            .flat()
            .forEach((annotation) => {
              const page = doc.pages.find((p) => p.index === annotation.pageIndex)
              if (page) {
                this.engine.createPageAnnotation!(doc, page, annotation)
              }
            })
        }
      },
    }
    this.executeWithTimeline(documentId, command)
  }

  private executeWithTimeline(documentId: string, command: Command) {
    const timeline = this.timelines[documentId]
    const timelineIndex = this.timelineIndices[documentId]

    // add to timeline
    timeline.splice(timelineIndex + 1)
    timeline.push(command)
    this.timelineIndices[documentId]++

    // execute command immediately
    command.execute()

    // update undo/redo state
    this.dispatch(setCanUndoRedo(this.timelineIndices[documentId], timeline.length))
  }

  private exportAnnotationsToJSON() {
    const documentId = this.getActiveDocumentId()
    if (!documentId) return

    const docState = this.state.documents[documentId]
    if (!docState) return

    const annotations = Object.values(docState.byUid)
    const exportData = {
      exportedBy: this.config.author,
      timestamp: new Date().toISOString(),
      metadata: {
        totalAnnotations: annotations.length,
      },
      annotations: annotations,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pdf-annotations-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}