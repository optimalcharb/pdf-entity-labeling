import {
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  EventHook,
  PluginRegistry,
  SET_DOCUMENT,
} from "@embedpdf/core"
import {
  AnnotationCreateContext,
  ignore,
  PdfAnnotationObject,
  PdfDocumentObject,
  PdfErrorCode,
  PdfErrorReason,
  PdfTaskHelper,
  Task,
  uuidV4,
} from "@embedpdf/models"
import { Command, HistoryCapability, HistoryPlugin } from "@embedpdf/plugin-history"
import {
  InteractionManagerCapability,
  InteractionManagerPlugin,
} from "@embedpdf/plugin-interaction-manager"
import { SelectionCapability, SelectionPlugin } from "@embedpdf/plugin-selection"
import {
  AnnotationAction,
  commitPendingChanges,
  createAnnotation,
  deleteAnnotation,
  deselectAnnotation,
  patchAnnotation,
  purgeAnnotation,
  selectAnnotation,
  setActiveToolId,
  setAnnotations,
} from "./actions"
import type {
  AnnotationEvent,
  GetPageAnnotationsOptions,
  RenderAnnotationOptions,
  TrackedAnnotation,
} from "./custom-types"
import { getSelectedAnnotation } from "./selectors"
import type { AnnotationState } from "./state"
import type { AnnotationTool } from "./tools/annotation-tool"

// ***PLUGIN CONFIG***
// ***PLUGIN CONFIG***
export interface AnnotationPluginConfig extends BasePluginConfig {
  autoCommit?: boolean
  annotationAuthor?: string
  deactivateToolAfterCreate?: boolean
  selectAfterCreate?: boolean
}

// ***PLUGIN CAPABILITY***
export interface AnnotationCapability {
  onStateChange: EventHook<AnnotationState>
  onActiveToolChange: EventHook<AnnotationTool | null>
  onAnnotationEvent: EventHook<AnnotationEvent>

  getPageAnnotations: (
    options: GetPageAnnotationsOptions,
  ) => Task<PdfAnnotationObject[], PdfErrorReason>
  getSelectedAnnotation: () => TrackedAnnotation | null
  selectAnnotation: (pageIndex: number, annotationId: string) => void
  deselectAnnotation: () => void

  getActiveTool: () => AnnotationTool | null
  setActiveTool: (toolId: string | null) => void
  getTools: () => AnnotationTool[]
  getTool: <T extends AnnotationTool>(toolId: string) => T | undefined

  importAnnotations: (items: PdfAnnotationObject[]) => void
  exportAnnotations: () => any

  createAnnotation: <A extends PdfAnnotationObject>(
    pageIndex: number,
    annotation: A,
    context?: AnnotationCreateContext<A>,
  ) => void
  deleteAnnotation: (pageIndex: number, annotationId: string) => void
  updateAnnotation: (
    pageIndex: number,
    annotationId: string,
    patch: Partial<PdfAnnotationObject>,
  ) => void
  renderAnnotation: (options: RenderAnnotationOptions) => Task<Blob, PdfErrorReason>

  commit: () => Task<boolean, PdfErrorReason>
}

// ***PLUGIN CLASS***
export class AnnotationPlugin extends BasePlugin<
  AnnotationPluginConfig,
  AnnotationCapability,
  AnnotationState,
  AnnotationAction
> {
  static readonly id = "annotation" as const
  private readonly ANNOTATION_HISTORY_TOPIC = "annotations"

  public readonly config: AnnotationPluginConfig
  private readonly state$ = createBehaviorEmitter<AnnotationState>()
  private readonly interactionManager: InteractionManagerCapability | null
  private readonly selection: SelectionCapability | null
  private readonly history: HistoryCapability | null

  private pendingContexts = new Map<string, unknown>()
  private readonly activeTool$ = createBehaviorEmitter<AnnotationTool | null>(null)
  private readonly events$ = createBehaviorEmitter<AnnotationEvent>()

  private isInitialLoadComplete = false
  private importQueue: PdfAnnotationObject[] = []

  constructor(id: string, registry: PluginRegistry, config: AnnotationPluginConfig) {
    super(id, registry)
    this.config = config

    this.selection = registry.getPlugin<SelectionPlugin>("selection")?.provides() ?? null
    this.history = registry.getPlugin<HistoryPlugin>("history")?.provides() ?? null
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

    this.history?.onHistoryChange((topic) => {
      if (topic === this.ANNOTATION_HISTORY_TOPIC && this.config.autoCommit !== false) {
        this.commit()
      }
    })

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
          this.createAnnotation(selection.pageIndex, {
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
            this.setActiveTool(null)
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
      getSelectedAnnotation: () => getSelectedAnnotation(this.state),
      selectAnnotation: (pageIndex, id) => this.dispatch(selectAnnotation(pageIndex, id)),
      deselectAnnotation: () => this.dispatch(deselectAnnotation()),
      getActiveTool: () => this.getActiveTool(),
      setActiveTool: (toolId) => this.setActiveTool(toolId),
      getTools: () => this.state.tools,
      getTool: (toolId) => this.getTool(toolId),
      importAnnotations: (items) => this.importAnnotations(items),
      createAnnotation: (pageIndex, anno, ctx) => this.createAnnotation(pageIndex, anno, ctx),
      deleteAnnotation: (pageIndex, id) => this.deleteAnnotation(pageIndex, id),
      updateAnnotation: (pageIndex, id, patch) => this.updateAnnotation(pageIndex, id, patch),
      renderAnnotation: (options) => this.renderAnnotation(options),
      commit: () => this.commit(),
      exportAnnotations: () => this.exportAnnotationsToJSON(),
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

  private renderAnnotation({ pageIndex, annotation, options }: RenderAnnotationOptions) {
    const coreState = this.coreState.core

    if (!coreState.document) {
      return PdfTaskHelper.reject({ code: PdfErrorCode.NotFound, message: "Document not found" })
    }

    const page = coreState.document.pages.find((page) => page.index === pageIndex)
    if (!page) {
      return PdfTaskHelper.reject({ code: PdfErrorCode.NotFound, message: "Page not found" })
    }

    return this.engine.renderPageAnnotation(coreState.document, page, annotation, options)
  }

  private importAnnotations(items: PdfAnnotationObject[]) {
    // If initial load hasn't completed, queue the items
    if (!this.isInitialLoadComplete) {
      this.importQueue.push(...items)
      return
    }
    // Otherwise, import immediately
    this.processImportItems(items)
  }

  private processImportQueue() {
    if (this.importQueue.length === 0) return
    const items = [...this.importQueue]
    this.importQueue = [] // Clear the queue
    this.processImportItems(items)
  }

  private processImportItems(items: PdfAnnotationObject[]) {
    for (const annotation of items) {
      const pageIndex = annotation.pageIndex
      this.dispatch(createAnnotation(pageIndex, annotation))
    }
    if (this.config.autoCommit !== false) this.commit()
  }

  private createAnnotation<A extends PdfAnnotationObject>(
    pageIndex: number,
    annotation: A,
    ctx?: AnnotationCreateContext<A>,
  ) {
    const id = annotation.id
    const newAnnotation = {
      ...annotation,
      author: annotation.author ?? this.config.annotationAuthor,
    }
    const execute = () => {
      this.dispatch(createAnnotation(pageIndex, newAnnotation))
      if (ctx) this.pendingContexts.set(id, ctx)
      this.events$.emit({
        type: "create",
        annotation: newAnnotation,
        pageIndex,
        ctx,
        committed: false,
      })
    }

    if (!this.history) {
      execute()
      if (this.config.autoCommit) this.commit()
      return
    }
    const command: Command = {
      execute,
      undo: () => {
        this.pendingContexts.delete(id)
        this.dispatch(deselectAnnotation())
        this.dispatch(deleteAnnotation(pageIndex, id))
        this.events$.emit({
          type: "delete",
          annotation: newAnnotation,
          pageIndex,
          committed: false,
        })
      },
    }
    this.history.register(command, this.ANNOTATION_HISTORY_TOPIC)
  }

  private deleteAnnotation(pageIndex: number, id: string) {
    const originalAnnotation = this.state.byUid[id]?.object
    if (!originalAnnotation) return

    const execute = () => {
      this.dispatch(deselectAnnotation())
      this.dispatch(deleteAnnotation(pageIndex, id))
      this.events$.emit({
        type: "delete",
        annotation: originalAnnotation,
        pageIndex,
        committed: false,
      })
    }

    if (!this.history) {
      execute()
      if (this.config.autoCommit !== false) this.commit()
      return
    }
    const command: Command = {
      execute,
      undo: () => {
        this.dispatch(createAnnotation(pageIndex, originalAnnotation))
        this.events$.emit({
          type: "create",
          annotation: originalAnnotation,
          pageIndex,
          committed: false,
        })
      },
    }
    this.history.register(command, this.ANNOTATION_HISTORY_TOPIC)
  }

  private updateAnnotation(pageIndex: number, id: string, patch: Partial<PdfAnnotationObject>) {
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
        pageIndex,
        patch: patchWithAuthor,
        committed: false,
      })
    }

    if (!this.history) {
      execute()
      if (this.config.autoCommit !== false) this.commit()
      return
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
          pageIndex,
          patch: undoPatch,
          committed: false,
        })
      },
    }
    this.history.register(command, this.ANNOTATION_HISTORY_TOPIC)
  }

  public getActiveTool(): AnnotationTool | null {
    if (!this.state.activeToolId) return null
    return this.state.tools.find((t) => t.id === this.state.activeToolId) ?? null
  }

  public setActiveTool(toolId: string | null): void {
    if (toolId === this.state.activeToolId) return
    const tool = this.state.tools.find((t) => t.id === toolId)
    if (tool) {
      this.interactionManager?.activate(tool.interaction.mode ?? tool.id)
    } else {
      this.interactionManager?.activateDefaultMode()
    }
  }

  public getTool<T extends AnnotationTool>(toolId: string): T | undefined {
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
          const ctx = this.pendingContexts.get(ta.object.id) as AnnotationCreateContext<
            typeof ta.object
          >
          const task = this.engine.createPageAnnotation!(doc, page, ta.object, ctx)
          task.wait(() => {
            this.events$.emit({
              type: "create",
              annotation: ta.object,
              pageIndex: ta.object.pageIndex,
              ctx,
              committed: true,
            })
            this.pendingContexts.delete(ta.object.id)
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

  exportAnnotationsToJSON() {
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
