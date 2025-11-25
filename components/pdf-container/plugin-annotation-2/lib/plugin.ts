import {
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  EventHook,
  PluginRegistry,
  SET_DOCUMENT,
} from "@embedpdf/core"
import {
  PdfAnnotationObject,
  PdfDocumentObject,
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
  clearAnnotations,
  commitPendingChanges,
  createAnnotation,
  deleteAnnotation,
  deselectAnnotation,
  patchAnnotation,
  purgeAnnotation,
  selectAnnotation,
  setActiveToolId,
  setAnnotations,
  setCanUndoRedo,
  setToolDefaults,
} from "./actions"
import type { AnnotationEvent, Command, TrackedAnnotation } from "./custom-types"
import type { PdfTextMarkupAnnotationObject } from "./pdf-text-markup-annotation-object"
import type { AnnotationState } from "./state"
import type { AnnotationTool } from "./tools/annotation-tool"

function ignore() {}

// ***PLUGIN CONFIG***
export interface AnnotationPluginConfig extends BasePluginConfig {
  annotationAuthor?: string
  deactivateToolAfterCreate?: boolean
  selectAfterCreate?: boolean
}

// ***PLUGIN CAPABILITY***
export interface AnnotationCapability {
  onStateChange: EventHook<AnnotationState>
  onActiveToolChange: EventHook<AnnotationTool | null>
  onAnnotationEvent: EventHook<AnnotationEvent>
  // getPageAnnotations uses PDFium to get any annotations saved in the PDF, even those not made by this plugin
  getPageAnnotations: (options: {
    pageIndex: number
  }) => Task<PdfAnnotationObject[], PdfErrorReason>

  selectAnnotation: (pageIndex: number, annotationId: string) => void
  deselectAnnotation: () => void

  activateTool: (toolId: string | null) => void
  setToolDefaults: (toolId: string, patch: Partial<PdfTextMarkupAnnotationObject>) => void // set the props for new annotations created using a tool
  setActiveToolDefaults: (patch: Partial<PdfTextMarkupAnnotationObject>) => void

  exportAnnotationsToJSON: () => void // temp
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

  private readonly activeTool$ = createBehaviorEmitter<AnnotationTool | null>(null)
  private readonly events$ = createBehaviorEmitter<AnnotationEvent>()

  private isInitialLoadComplete: boolean = false
  private loadingQueue: PdfTextMarkupAnnotationObject[] = []

  private timeline: Command[] = []
  private timelineIndex: number = -1

  constructor(id: string, registry: PluginRegistry, config: AnnotationPluginConfig) {
    super(id, registry)
    this.config = config

    this.selection = registry.getPlugin<SelectionPlugin>("selection")?.provides() ?? null
    this.interactionManager =
      registry.getPlugin<InteractionManagerPlugin>("interaction-manager")?.provides() ?? null

    this.coreStore.onAction(SET_DOCUMENT, (_, state) => {
      const doc = state.core.document
      this.isInitialLoadComplete = false
      if (doc) this.getAllAnnotations(doc)
    })
  }

  async initialize(): Promise<void> {
    // Register interaction modes for all tools defined in the initial state
    const registerInteractionForTool = (tool: AnnotationTool) => {
      this.interactionManager?.registerMode({
        id: tool.interaction.mode ?? tool.id,
        scope: "page",
        exclusive: tool.interaction.exclusive,
        cursor: tool.interaction.cursor,
      })
      if (tool.interaction.textSelection) {
        this.selection?.enableForMode(tool.interaction.mode ?? tool.id)
      }
    }
    this.state.tools.forEach(registerInteractionForTool)

    this.interactionManager?.onModeChange((s) => {
      const newToolId =
        this.state.tools.find((t) => (t.interaction.mode ?? t.id) === s.activeMode)?.id ?? null
      if (newToolId !== this.state.activeToolId) {
        this.dispatch(setActiveToolId(newToolId))
      }
    })

    this.selection?.onEndSelection(() => {
      const activeTool = this.getActiveTool()
      if (!activeTool || !activeTool.interaction.textSelection) return

      const formattedSelection = this.selection?.getFormattedSelection()
      const selectionText = this.selection?.getSelectedText()
      if (!formattedSelection || !selectionText) return

      for (const selection of formattedSelection) {
        selectionText.wait((text) => {
          const annotationId = uuidV4()
          // Create an annotation using the defaults from the active text tool
          this.createAnnotation({
            ...activeTool.defaults,
            rect: selection.rect,
            segmentRects: selection.segmentRects,
            pageIndex: selection.pageIndex,
            created: new Date(),
            id: annotationId,
            custom: {
              text: text.join("\n"),
            },
          } as PdfTextMarkupAnnotationObject)

          if (this.config.deactivateToolAfterCreate) {
            this.activateToolId(null)
          }
          if (this.config.selectAfterCreate) {
            this.dispatch(selectAnnotation(selection.pageIndex, annotationId))
          }
        }, ignore)
      }

      this.selection?.clear()
    })
  }

  protected buildCapability(): AnnotationCapability {
    return {
      onStateChange: this.state$.on,
      onActiveToolChange: this.activeTool$.on,
      onAnnotationEvent: this.events$.on,
      getPageAnnotations: (options) => this.getPageAnnotations(options),
      selectAnnotation: (pageIndex, id) => this.dispatch(selectAnnotation(pageIndex, id)),
      deselectAnnotation: () => this.dispatch(deselectAnnotation()),
      activateTool: (toolId) => this.activateToolId(toolId),
      setToolDefaults: (toolId, patch) => this.dispatch(setToolDefaults(toolId, patch)),
      setActiveToolDefaults: (patch) =>
        this.state.activeToolId && this.dispatch(setToolDefaults(this.state.activeToolId, patch)),
      createAnnotations: (items) => this.createAnnotations(items),
      createAnnotation: (anno) => this.createAnnotation(anno),
      deleteAnnotation: (id) => this.deleteAnnotation(id),
      deleteAnnotations: (ids) => this.deleteAnnotations(ids),
      updateAnnotation: (id, patch) => this.updateAnnotation(id, patch),
      updateAnnotations: (items) => this.updateAnnotations(items),
      clearAnnotations: () => this.clearAllAnnotations(),
      exportAnnotationsToJSON: () => this.exportAnnotationsToJSON(),
      undo: () => {
        if (this.timelineIndex > -1) {
          const command = this.timeline[this.timelineIndex]
          command?.undo()
          this.timelineIndex--
          this.dispatch(setCanUndoRedo(this.timelineIndex, this.timeline.length))
        }
      },
      redo: () => {
        if (this.timelineIndex < this.timeline.length - 1) {
          this.timelineIndex++
          const command = this.timeline[this.timelineIndex]
          command?.execute()
          this.dispatch(setCanUndoRedo(this.timelineIndex, this.timeline.length))
        }
      },
    }
  }

  override onStoreUpdated(prev: AnnotationState, next: AnnotationState): void {
    this.state$.emit(next)
    // If the active tool ID changes, or the tools array itself changes, emit the new active tool
    if (prev.activeToolId !== next.activeToolId || prev.tools !== next.tools) {
      this.activeTool$.emit(this.getActiveTool())
    }
  }

  private getAllAnnotations(doc: PdfDocumentObject) {
    const task = this.engine.getAllAnnotations(doc)
    task.wait((annotations) => {
      // filter annotations (PdfAnnotationObjects that are PdfTextMarkupAnnotationObjects)
      this.dispatch(setAnnotations(annotations))

      this.isInitialLoadComplete = true

      if (this.loadingQueue.length > 0) {
        this.createQueuedAnnotations()
      }

      this.events$.emit({
        type: "loaded",
        total: Object.values(annotations).reduce(
          (sum, pageAnnotations) => sum + pageAnnotations.length,
          0,
        ),
      })
    }, ignore)
  }

  private getPageAnnotations(options: {
    pageIndex: number
  }): Task<PdfAnnotationObject[], PdfErrorReason> {
    const { pageIndex } = options
    const doc = this.coreState.core.document

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
    if (!this.isInitialLoadComplete) {
      this.loadingQueue.push(...items)
      return
    }
    this.batchCreateAnnotations(items)
  }

  // consumer capability to batch update annotations
  private updateAnnotations(
    items: { id: string; patch: Partial<PdfTextMarkupAnnotationObject> }[],
  ) {
    for (const { id, patch } of items) {
      patch.modified = new Date()
      patch.author = patch.author ?? this.config.annotationAuthor
      this.dispatch(patchAnnotation(id, patch))
    }
    this.commit()
  }

  // consumer capability to batch delete annotations
  private deleteAnnotations(annotationIds: string[]) {
    for (const id of annotationIds) {
      this.dispatch(deleteAnnotation(id))
    }
    this.commit()
  }

  // internal process to load annotations existing in a PDF
  private createQueuedAnnotations() {
    if (this.loadingQueue.length === 0) return
    const items = [...this.loadingQueue]
    this.loadingQueue = []
    this.batchCreateAnnotations(items)
  }

  // batchCreate has no undo capability since it is used by consumer programs, not users
  private batchCreateAnnotations(items: PdfTextMarkupAnnotationObject[]) {
    for (const annotation of items) {
      annotation.created = new Date()
      annotation.author = annotation.author ?? this.config.annotationAuthor
      this.dispatch(createAnnotation(annotation))
    }
    this.commit()
  }

  private createAnnotation(annotation: PdfTextMarkupAnnotationObject) {
    const id = annotation.id
    const pageIndex = annotation.pageIndex
    const annotationModified = {
      ...annotation,
      created: new Date(),
      author: annotation.author ?? this.config.annotationAuthor,
    }
    const execute = () => {
      this.dispatch(createAnnotation(annotationModified))
      this.events$.emit({
        type: "create",
        annotation: annotationModified,
        pageIndex,
        committed: false,
      })
    }

    const command: Command = {
      execute,
      undo: () => {
        if (this.state.selectedUid === id) this.dispatch(deselectAnnotation())
        this.dispatch(deleteAnnotation(id))
        this.events$.emit({
          type: "delete",
          annotation: annotationModified,
          pageIndex,
          committed: false,
        })
      },
    }
    this.commitWithTimeline(command)
  }

  private deleteAnnotation(id: string) {
    const originalAnnotation = this.state.byUid[id]?.object
    if (!originalAnnotation) return

    const execute = () => {
      if (this.state.selectedUid === id) this.dispatch(deselectAnnotation())
      this.dispatch(deleteAnnotation(id))
      this.events$.emit({
        type: "delete",
        annotation: originalAnnotation,
        pageIndex: originalAnnotation.pageIndex,
        committed: false,
      })
    }

    const command: Command = {
      execute,
      undo: () => {
        this.dispatch(createAnnotation(originalAnnotation))
        this.events$.emit({
          type: "create",
          annotation: originalAnnotation,
          pageIndex: originalAnnotation.pageIndex,
          committed: false,
        })
      },
    }
    this.commitWithTimeline(command)
  }

  private updateAnnotation(id: string, patch: Partial<PdfTextMarkupAnnotationObject>) {
    const originalAnnotation = this.state.byUid[id]?.object
    if (!originalAnnotation) return
    if (patch.id !== id) patch.id = id // id is immutable
    const patchModified = {
      ...patch,
      modified: new Date(),
      author: patch.author ?? this.config.annotationAuthor,
    }

    const execute = () => {
      this.dispatch(patchAnnotation(id, patchModified))
      this.events$.emit({
        type: "update",
        annotation: originalAnnotation,
        pageIndex: originalAnnotation.pageIndex,
        patch: patchModified,
        committed: false,
      })
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
        this.dispatch(patchAnnotation(id, originalAnnotation))
        this.events$.emit({
          type: "update",
          annotation: originalAnnotation,
          pageIndex: originalAnnotation.pageIndex,
          patch: undoPatch,
          committed: false,
        })
      },
    }
    this.commitWithTimeline(command)
  }

  private clearAllAnnotations() {
    const previousAnnotations: Record<number, PdfTextMarkupAnnotationObject[]> = {}
    Object.entries(this.state.byPage).forEach(([pageIndex, uids]) => {
      const pageAnnos = uids
        .map((uid) => this.state.byUid[uid]?.object)
        .filter((a): a is PdfTextMarkupAnnotationObject => !!a)
      if (pageAnnos.length > 0) {
        previousAnnotations[Number(pageIndex)] = pageAnnos
      }
    })

    const command: Command = {
      execute: () => {
        this.dispatch(clearAnnotations())
      },
      undo: () => {
        this.dispatch(setAnnotations(previousAnnotations))
      },
    }
    // use same logic to add to timeline but don't call commit
    this.commitWithTimeline(command, false)
  }

  private getActiveTool(): AnnotationTool | null {
    if (!this.state.activeToolId) return null
    return this.state.tools.find((t) => t.id === this.state.activeToolId) ?? null
  }

  /**
   * 1. Activates tool in InteractionManager
   * 2. callback for InteractionManager?.onModeChange in initialize() dispatches setActiveToolId action
   * 3. reducer changes this.state.activeToolId
   */
  private activateToolId(toolId: string | null): void {
    if (toolId === this.state.activeToolId) return
    const tool = this.state.tools.find((t) => t.id === toolId)
    if (tool) {
      this.interactionManager?.activate(tool.interaction.mode ?? tool.id)
    } else {
      this.interactionManager?.activateDefaultMode()
    }
  }

  private commitWithTimeline(command: Command, requiresCommit: boolean = true) {
    // add to timeline
    this.timeline.splice(this.timelineIndex + 1)
    this.timeline.push(command)
    this.timelineIndex++

    // emit event
    command.execute()

    // process all pending events
    if (requiresCommit) this.commit()

    // change state.canUndo, state.canRedo
    this.dispatch(setCanUndoRedo(this.timelineIndex, this.timeline.length))
  }

  private commit(): Task<boolean, PdfErrorReason> {
    const task = new Task<boolean, PdfErrorReason>()

    if (!this.state.hasPendingChanges) return PdfTaskHelper.resolve(true)

    const doc = this.coreState.core.document
    if (!doc)
      return PdfTaskHelper.reject({ code: PdfErrorCode.NotFound, message: "Document not found" })

    const creations: Task<string, PdfErrorReason>[] = []
    const updates: Task<boolean, PdfErrorReason>[] = []
    const deletions: { ta: TrackedAnnotation; uid: string }[] = []

    // 1. Group all pending changes by operation type
    for (const [uid, ta] of Object.entries(this.state.byUid)) {
      if (ta.commitState === "synced") continue

      const page = doc.pages.find((p) => p.index === ta.object.pageIndex)
      if (!page) continue

      switch (ta.commitState) {
        case "new":
          const task = this.engine.createPageAnnotation!(doc, page, ta.object)
          task.wait(() => {
            this.events$.emit({
              type: "create",
              annotation: ta.object,
              pageIndex: ta.object.pageIndex,
              committed: true,
            })
          }, ignore)
          creations.push(task)
          break
        case "dirty":
          const updateTask = this.engine.updatePageAnnotation!(doc, page, ta.object)
          updateTask.wait(() => {
            this.events$.emit({
              type: "update",
              annotation: ta.object,
              pageIndex: ta.object.pageIndex,
              patch: ta.object,
              committed: true,
            })
          }, ignore)
          updates.push(updateTask)
          break
        case "deleted":
          deletions.push({ ta, uid })
          break
      }
    }

    // 2. Create deletion tasks
    const deletionTasks: Task<boolean, PdfErrorReason>[] = []
    for (const { ta, uid } of deletions) {
      const page = doc.pages.find((p) => p.index === ta.object.pageIndex)!
      // Only delete if it was previously synced (i.e., exists in the PDF)
      if (ta.commitState === "deleted" && ta.object.id) {
        const task = new Task<boolean, PdfErrorReason>()
        const removeTask = this.engine.removePageAnnotation!(doc, page, ta.object)
        removeTask.wait(() => {
          this.dispatch(purgeAnnotation(uid))
          this.events$.emit({
            type: "delete",
            annotation: ta.object,
            pageIndex: ta.object.pageIndex,
            committed: true,
          })
          task.resolve(true)
        }, task.fail)
        deletionTasks.push(task)
      } else {
        // If it was never synced, just remove from state
        this.dispatch(purgeAnnotation(uid))
      }
    }

    // 3. Chain the operations: creations/updates -> deletions -> finalize
    const allWriteTasks = [...creations, ...updates, ...deletionTasks]

    Task.allSettled(allWriteTasks).wait(() => {
      // 4. Finalize the commit by updating the commitState of all items.
      this.dispatch(commitPendingChanges())
      task.resolve(true)
    }, task.fail)

    return task
  }

  private exportAnnotationsToJSON() {
    const annotations = Object.values(this.state.byUid).map((ta: TrackedAnnotation) => ta.object)
    const exportData = {
      exportedBy: this.config.annotationAuthor,
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

  async destroy(): Promise<void> {
    this.activeTool$.clear()
    this.events$.clear()
    super.destroy()
  }
}
