import {
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  EventHook,
  PluginRegistry,
  SET_DOCUMENT,
} from "@embedpdf/core"
import {
  ignore,
  PdfAnnotationObject,
  PdfDocumentObject,
  PdfErrorCode,
  PdfErrorReason,
  PdfTaskHelper,
  Task,
  uuidV4,
} from "@embedpdf/models"
import {
  InteractionManagerCapability,
  InteractionManagerPlugin,
} from "@embedpdf/plugin-interaction-manager"
import { SelectionCapability, SelectionPlugin } from "@embedpdf/plugin-selection"
import {
  type AnnotationAction,
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
import type {
  AnnotationEvent,
  Command,
  GetPageAnnotationsOptions,
  TrackedAnnotation,
} from "./custom-types"
import type { AnnotationState } from "./state"
import type { AnnotationTool } from "./tools/annotation-tool"

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
  // use PDFium to get any annotations saved in the PDF, even those not made by this plugin
  getPageAnnotations: (
    options: GetPageAnnotationsOptions,
  ) => Task<PdfAnnotationObject[], PdfErrorReason>

  selectAnnotation: (pageIndex: number, annotationId: string) => void
  deselectAnnotation: () => void

  getActiveTool: () => AnnotationTool | null
  getActiveToolId: () => string | null
  activateTool: (toolId: string | null) => void
  getToolIds: () => string[]
  getTools: () => AnnotationTool[]
  getTool: <T extends AnnotationTool>(toolId: string) => T | undefined
  // set the props for new annotations created using a tool
  setToolDefaults: (toolId: string, patch: Partial<PdfAnnotationObject>) => void
  setActiveToolDefaults: (patch: Partial<PdfAnnotationObject>) => void

  importAnnotations: (items: PdfAnnotationObject[]) => void
  // temp
  exportAnnotationsToJSON: () => any

  createAnnotation: (annotation: PdfAnnotationObject) => void
  deleteAnnotation: (annotationId: string) => void
  // change the props of an annotation
  updateAnnotation: (annotationId: string, patch: Partial<PdfAnnotationObject>) => void
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
  private importQueue: PdfAnnotationObject[] = []

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
    this.state.tools.forEach((tool) => this.registerInteractionForTool(tool))

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
          } as PdfAnnotationObject)

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

  private registerInteractionForTool(tool: AnnotationTool) {
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

  protected buildCapability(): AnnotationCapability {
    return {
      onStateChange: this.state$.on,
      onActiveToolChange: this.activeTool$.on,
      onAnnotationEvent: this.events$.on,
      getPageAnnotations: (options) => this.getPageAnnotations(options),
      selectAnnotation: (pageIndex, id) => this.dispatch(selectAnnotation(pageIndex, id)),
      deselectAnnotation: () => this.dispatch(deselectAnnotation()),
      getActiveTool: () => this.getActiveTool(),
      getActiveToolId: () => this.state.activeToolId,
      activateTool: (toolId) => this.activateToolId(toolId),
      getToolIds: () => this.state.tools.map((tool) => tool.id),
      getTool: (toolId) => this.getTool(toolId),
      getTools: () => this.state.tools,
      setToolDefaults: (toolId, patch) => this.dispatch(setToolDefaults(toolId, patch)),
      setActiveToolDefaults: (patch) =>
        this.state.activeToolId && this.dispatch(setToolDefaults(this.state.activeToolId, patch)),
      importAnnotations: (items) => this.importAnnotations(items),
      createAnnotation: (anno) => this.createAnnotation(anno),
      deleteAnnotation: (id) => this.deleteAnnotation(id),
      updateAnnotation: (id, patch) => this.updateAnnotation(id, patch),
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
      this.dispatch(setAnnotations(annotations))

      this.isInitialLoadComplete = true

      if (this.importQueue.length > 0) {
        this.processImportQueue()
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

  private getPageAnnotations(
    options: GetPageAnnotationsOptions,
  ): Task<PdfAnnotationObject[], PdfErrorReason> {
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
  private importAnnotations(items: PdfAnnotationObject[]) {
    if (!this.isInitialLoadComplete) {
      this.importQueue.push(...items)
      return
    }
    this.processImportItems(items)
  }

  // internal process to load annotations existing in a PDF
  private processImportQueue() {
    if (this.importQueue.length === 0) return
    const items = [...this.importQueue]
    this.importQueue = []
    this.processImportItems(items)
  }

  private processImportItems(items: PdfAnnotationObject[]) {
    for (const annotation of items) {
      const pageIndex = annotation.pageIndex
      this.dispatch(createAnnotation(annotation))
    }
    this.commit()
  }

  private commitWithTimeline(command: Command) {
    // add to timeline
    this.timeline.splice(this.timelineIndex + 1)
    this.timeline.push(command)
    this.timelineIndex++

    // emit event
    command.execute()

    // process all pending events
    this.commit()

    // change state.canUndo, state.canRedo
    this.dispatch(setCanUndoRedo(this.timelineIndex, this.timeline.length))
  }

  private createAnnotation(annotation: PdfAnnotationObject) {
    const id = annotation.id
    const pageIndex = annotation.pageIndex
    const newAnnotation = {
      ...annotation,
      author: annotation.author ?? this.config.annotationAuthor,
    }
    const execute = () => {
      this.dispatch(createAnnotation(newAnnotation))
      this.events$.emit({
        type: "create",
        annotation: newAnnotation,
        pageIndex,
        committed: false,
      })
    }

    const command: Command = {
      execute,
      undo: () => {
        this.dispatch(deselectAnnotation())
        this.dispatch(deleteAnnotation(id))
        this.events$.emit({
          type: "delete",
          annotation: newAnnotation,
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
      this.dispatch(deselectAnnotation())
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

  private updateAnnotation(id: string, patch: Partial<PdfAnnotationObject>) {
    const originalAnnotation = this.state.byUid[id]?.object
    if (!originalAnnotation) return
    const patchWithAuthor = {
      ...patch,
      author: patch.author ?? this.config.annotationAuthor,
    }

    const execute = () => {
      this.dispatch(patchAnnotation(id, patch))
      this.events$.emit({
        type: "update",
        annotation: originalAnnotation,
        pageIndex: originalAnnotation.pageIndex,
        patch: patchWithAuthor,
        committed: false,
      })
    }

    const undoPatch = Object.fromEntries(
      Object.keys(patch).map((key) => [key, originalAnnotation[key as keyof PdfAnnotationObject]]),
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

  private getTool<T extends AnnotationTool>(toolId: string): T | undefined {
    return this.state.tools.find((t) => t.id === toolId) as T | undefined
  }

  private commit(): Task<boolean, PdfErrorReason> {
    const task = new Task<boolean, PdfErrorReason>()

    if (!this.state.hasPendingChanges) return PdfTaskHelper.resolve(true)

    const doc = this.coreState.core.document
    if (!doc)
      return PdfTaskHelper.reject({ code: PdfErrorCode.NotFound, message: "Document not found" })

    const creations: Task<any, PdfErrorReason>[] = []
    const updates: Task<any, PdfErrorReason>[] = []
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
    const deletionTasks: Task<any, PdfErrorReason>[] = []
    for (const { ta, uid } of deletions) {
      const page = doc.pages.find((p) => p.index === ta.object.pageIndex)!
      // Only delete if it was previously synced (i.e., exists in the PDF)
      if (ta.commitState === "deleted" && ta.object.id) {
        const task = new Task<any, PdfErrorReason>()
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
    return exportData
  }
}
