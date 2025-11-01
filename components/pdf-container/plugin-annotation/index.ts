import React, { Fragment, useCallback, useEffect, useState } from "react"
import { jsx, jsxs } from "react/jsx-runtime"
import {
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  ignore,
  PdfErrorCode,
  PdfTaskHelper,
  type PluginManifest,
  PluginPackage,
  PluginRegistry,
  type Rect,
  type Reducer,
  SET_DOCUMENT,
  Task,
  useCapability,
  usePlugin,
  uuidV4,
} from "../core"
import { HistoryCapability } from "../plugin-history"
import { InteractionManagerCapability } from "../plugin-interaction-manager"
import { SelectionCapability, useSelectionCapability } from "../plugin-selection"

// *****CUSTOM TYPES******
// ***EVENTS***
type AnnotationEvent =
  | {
      type: "create"
      annotation: PdfAnnotationObject
      pageIndex: number
      committed: boolean
    }
  | {
      type: "update"
      annotation: PdfAnnotationObject
      pageIndex: number
      committed: boolean
    }
  | {
      type: "delete"
      annotation: PdfAnnotationObject
      pageIndex: number
      committed: boolean
    }
  | {
      type: "loaded"
      total: number
    }

// ***OTHER CUSTOM TYPES***
export enum PdfAnnotationSubtype {
  UNKNOWN = 0,
  HIGHLIGHT = 1,
  UNDERLINE = 2,
  SQUIGGLY = 3,
}

export interface PdfAnnotationObject {
  id: string
  pageIndex: number
  type: PdfAnnotationSubtype
  color: string
  opacity?: number
  author?: string
  created?: Date
  contents?: string
  rect: {
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }
  segmentRects?: Array<{
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }>
}

type CommitState = "new" | "deleted" | "synced" | "ignored" | "dirty"

interface TrackedAnnotation<T = PdfAnnotationObject> {
  commitState: CommitState
  object: T
}

export interface AnnotationTool {
  id: string
  type: PdfAnnotationSubtype
  color: string
  opacity: number
  interaction: {
    exclusive: boolean
    textSelection?: boolean
    mode?: string
    cursor?: string
  }
  behavior?: {
    deactivateToolAfterCreate?: boolean
    selectAfterCreate?: boolean
  }
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const ANNOTATION_PLUGIN_ID = "annotation"

// ***STATE***
export interface AnnotationState {
  pages: Record<number, string[]>
  byUid: Record<string, TrackedAnnotation>
  selectedUid: string | null
  activeToolId: string | null
  tools: AnnotationTool[]
  hasPendingChanges: boolean
}

// ***INITIAL STATE***
const initialTools: AnnotationTool[] = [
  {
    id: "highlight",
    type: PdfAnnotationSubtype.HIGHLIGHT,
    color: "#FFCD45",
    opacity: 0.6,
    interaction: {
      exclusive: true,
      textSelection: true,
      mode: "highlight",
      cursor: "text",
    },
  },
  {
    id: "underline",
    type: PdfAnnotationSubtype.UNDERLINE,
    color: "#E44234",
    opacity: 1,
    interaction: {
      exclusive: true,
      textSelection: true,
      mode: "underline",
      cursor: "text",
    },
  },
  {
    id: "squiggly",
    type: PdfAnnotationSubtype.SQUIGGLY,
    color: "#E44234",
    opacity: 1,
    interaction: {
      exclusive: true,
      textSelection: true,
      mode: "squiggly",
      cursor: "text",
    },
  },
]
const initialState = (cfg: { tools?: AnnotationTool[] }) => {
  const toolMap = /* @__PURE__ */ new Map<string, AnnotationTool>()
  initialTools.forEach((t: AnnotationTool) => toolMap.set(t.id, t))
  ;(cfg.tools || []).forEach((t: AnnotationTool) => toolMap.set(t.id, t))
  return {
    pages: {},
    byUid: {},
    selectedUid: null,
    activeToolId: null,
    tools: Array.from(toolMap.values()),
    hasPendingChanges: false,
  }
}

// ***ACTION CONSTANTS***
const SET_ANNOTATIONS = "ANNOTATION/SET_ANNOTATIONS" as const
const SELECT_ANNOTATION = "ANNOTATION/SELECT_ANNOTATION" as const
const DESELECT_ANNOTATION = "ANNOTATION/DESELECT_ANNOTATION" as const
const CREATE_ANNOTATION = "ANNOTATION/CREATE_ANNOTATION" as const
const DELETE_ANNOTATION = "ANNOTATION/DELETE_ANNOTATION" as const
const COMMIT_PENDING_CHANGES = "ANNOTATION/COMMIT" as const
const PURGE_ANNOTATION = "ANNOTATION/PURGE_ANNOTATION" as const
const SET_ACTIVE_TOOL_ID = "ANNOTATION/SET_ACTIVE_TOOL_ID" as const
const RECOLOR_ANNOTATION = "ANNOTATION/RECOLOR_ANNOTATION" as const

// ***ACTION INTERFACES***
interface SetAnnotationsAction {
  type: typeof SET_ANNOTATIONS
  payload: Record<number, PdfAnnotationObject[]>
}
interface SelectAnnotationAction {
  type: typeof SELECT_ANNOTATION
  payload: { pageIndex: number; id: string }
}
interface DeselectAnnotationAction {
  type: typeof DESELECT_ANNOTATION
  payload?: undefined
}
interface CreateAnnotationAction {
  type: typeof CREATE_ANNOTATION
  payload: { pageIndex: number; annotation: PdfAnnotationObject }
}
interface DeleteAnnotationAction {
  type: typeof DELETE_ANNOTATION
  payload: { pageIndex: number; id: string }
}
interface CommitPendingChangesAction {
  type: typeof COMMIT_PENDING_CHANGES
  payload?: undefined
}
interface PurgeAnnotationAction {
  type: typeof PURGE_ANNOTATION
  payload: { uid: string }
}
interface SetActiveToolIdAction {
  type: typeof SET_ACTIVE_TOOL_ID
  payload: string | null
}
interface RecolorAnnotationAction {
  type: typeof RECOLOR_ANNOTATION
  payload: { uid: string; color: string }
}

// ***ACTION UNION***
export type AnnotationAction =
  | SetAnnotationsAction
  | SelectAnnotationAction
  | DeselectAnnotationAction
  | CreateAnnotationAction
  | DeleteAnnotationAction
  | CommitPendingChangesAction
  | PurgeAnnotationAction
  | SetActiveToolIdAction
  | RecolorAnnotationAction

// ***ACTION CREATORS***
const setAnnotations = (p: Record<number, PdfAnnotationObject[]>) => ({
  type: SET_ANNOTATIONS,
  payload: p,
})
const selectAnnotation = (pageIndex: number, id: string) => ({
  type: SELECT_ANNOTATION,
  payload: { pageIndex, id },
})
const deselectAnnotation = () => ({ type: DESELECT_ANNOTATION })
const createAnnotation = (pageIndex: number, annotation: PdfAnnotationObject) => ({
  type: CREATE_ANNOTATION,
  payload: { pageIndex, annotation },
})
const deleteAnnotation = (pageIndex: number, id: string) => ({
  type: DELETE_ANNOTATION,
  payload: { pageIndex, id },
})
const commitPendingChanges = () => ({ type: COMMIT_PENDING_CHANGES })
const purgeAnnotation = (uid: string) => ({
  type: PURGE_ANNOTATION,
  payload: { uid },
})
const setActiveToolId = (id: string | null) => ({
  type: SET_ACTIVE_TOOL_ID,
  payload: id,
})
const recolorAnnotation = (uid: string, color: string) => ({
  type: RECOLOR_ANNOTATION,
  payload: { uid, color },
})

// ***ACTION REDUCER***
const reducer: Reducer<AnnotationState, AnnotationAction> = (
  state: AnnotationState,
  action: AnnotationAction,
) => {
  switch (action.type) {
    case SET_ANNOTATIONS: {
      const newPages = { ...state.pages }
      const newByUid = { ...state.byUid }
      for (const [pgStr, list] of Object.entries(action.payload)) {
        const pageIndex = Number(pgStr)
        const oldUidsOnPage = state.pages[pageIndex] || []
        for (const uid of oldUidsOnPage) {
          delete newByUid[uid]
        }
        const newUidsOnPage = (list as PdfAnnotationObject[]).map((a: PdfAnnotationObject) => {
          const uid = a.id
          newByUid[uid] = { commitState: "synced" as const, object: a }
          return uid
        })
        newPages[pageIndex] = newUidsOnPage
      }
      return { ...state, pages: newPages, byUid: newByUid }
    }
    case SET_ACTIVE_TOOL_ID:
      return { ...state, activeToolId: action.payload }
    case SELECT_ANNOTATION:
      return { ...state, selectedUid: action.payload.id }
    case DESELECT_ANNOTATION:
      return { ...state, selectedUid: null }
    case CREATE_ANNOTATION: {
      const { pageIndex, annotation } = action.payload
      const uid = annotation.id
      const newState = {
        ...state,
        pages: {
          ...state.pages,
          [pageIndex]: [...(state.pages[pageIndex] ?? []), uid],
        },
        byUid: {
          ...state.byUid,
          [uid]: { commitState: "new", object: annotation },
        },
        hasPendingChanges: true,
      }
      return newState as AnnotationState
    }
    case DELETE_ANNOTATION: {
      const { pageIndex, id: uid } = action.payload
      if (!state.byUid[uid]) return state
      return {
        ...state,
        pages: {
          ...state.pages,
          [pageIndex]: (state.pages[pageIndex] ?? []).filter((u) => u !== uid),
        },
        byUid: {
          ...state.byUid,
          [uid]: { ...state.byUid[uid], commitState: "deleted" },
        },
        hasPendingChanges: true,
      }
    }
    case RECOLOR_ANNOTATION: {
      const { uid, color } = action.payload
      if (!state.byUid[uid]) return state
      return {
        ...state,
        byUid: {
          ...state.byUid,
          [uid]: {
            ...state.byUid[uid],
            object: {
              ...state.byUid[uid].object,
              color,
            },
            commitState: "dirty",
          },
        },
        hasPendingChanges: true,
      }
    }
    case COMMIT_PENDING_CHANGES: {
      const cleaned: Record<string, TrackedAnnotation> = {}
      for (const [uid, ta] of Object.entries(state.byUid)) {
        cleaned[uid] = {
          ...ta,
          commitState: ta.commitState === "new" ? ("synced" as const) : ta.commitState,
        }
      }
      return { ...state, byUid: cleaned, hasPendingChanges: false }
    }
    case PURGE_ANNOTATION: {
      const { uid } = action.payload
      const { [uid]: _gone, ...rest } = state.byUid
      return { ...state, byUid: rest }
    }
    default:
      return state
  }
}

// ***PLUGIN CAPABILITY***
export interface AnnotationCapability {
  onStateChange: (callback: (state: AnnotationState) => void) => () => void
  onActiveToolChange: (callback: (tool: AnnotationTool | null) => void) => () => void
  onAnnotationEvent: (callback: (event: AnnotationEvent) => void) => () => void
  createAnnotation: (pageIndex: number, anno: PdfAnnotationObject) => void
  deleteAnnotation: (pageIndex: number, id: string) => void
  recolorAnnotation: (uid: string, color: string) => void
  commit: () => any
  getSelectedAnnotation: () => TrackedAnnotation | null
  selectAnnotation: (pageIndex: number, id: string) => void
  deselectAnnotation: () => void
  getActiveTool: () => AnnotationTool | null
  setActiveTool: (toolId: string | null) => void
  importAnnotations: (items: Array<{ annotation: PdfAnnotationObject }>) => void
  getPageAnnotations: (options: { pageIndex: number }) => any
  exportAnnotations: () => any
}

// ***PLUGIN CONFIG***
export interface AnnotationPluginConfig extends BasePluginConfig {
  enabled?: boolean
  tools?: AnnotationTool[]
  autoCommit?: boolean
  annotationAuthor?: string
  deactivateToolAfterCreate?: boolean
  selectAfterCreate?: boolean
}

// ***PLUGIN CLASS***
export class AnnotationPlugin extends BasePlugin<
  AnnotationPluginConfig,
  AnnotationCapability,
  AnnotationState,
  AnnotationAction
> {
  static readonly id: string = ANNOTATION_PLUGIN_ID
  private readonly ANNOTATION_HISTORY_TOPIC: string
  public readonly config: AnnotationPluginConfig
  private state$: any
  private readonly interactionManager: InteractionManagerCapability
  private readonly selection: SelectionCapability
  private readonly history: HistoryCapability
  private activeTool$: any
  private events$: any
  private isInitialLoadComplete = false
  private importQueue: Array<{ annotation: PdfAnnotationObject }> = []

  constructor(id: string, registry: PluginRegistry, config: AnnotationPluginConfig) {
    super(id, registry)
    this.ANNOTATION_HISTORY_TOPIC = "annotations"
    this.state$ = createBehaviorEmitter()
    this.activeTool$ = createBehaviorEmitter(null)
    this.events$ = createBehaviorEmitter()
    this.isInitialLoadComplete = false
    this.importQueue = []
    this.config = config
    const selectionPlugin = registry.getPlugin("selection")
    const historyPlugin = registry.getPlugin("history")
    const interactionManagerPlugin = registry.getPlugin("interaction-manager")

    this.selection = selectionPlugin ? selectionPlugin.provides() : undefined
    this.history = historyPlugin ? historyPlugin.provides() : undefined
    this.interactionManager = interactionManagerPlugin
      ? interactionManagerPlugin.provides()
      : undefined

    if (!this.selection || !this.history || !this.interactionManager) {
      throw new Error("Required plugins not found: selection, history, or interaction-manager")
    }
    this.coreStore.onAction(SET_DOCUMENT, (_, state) => {
      const doc = state.core.document
      this.isInitialLoadComplete = false
      if (doc) this.loadExistingAnnotations(doc)
    })
  }

  // setup communication with InteractionManager, History, and Selection plugins
  async initialize() {
    var _a, _b, _c
    ;(this.state as AnnotationState).tools.forEach((tool: AnnotationTool) => {
      var _tool_a, _tool_b
      ;(_tool_a = this.interactionManager) == null
        ? void 0
        : _tool_a.registerMode({
            id: tool.interaction.mode ?? tool.id,
            scope: "page",
            exclusive: tool.interaction.exclusive,
            cursor: tool.interaction.cursor,
          })
      if (tool.interaction.textSelection) {
        ;(_tool_b = this.selection) == null
          ? void 0
          : _tool_b.enableForMode(tool.interaction.mode ?? tool.id)
      }
    })
    ;(_a = this.history) == null
      ? void 0
      : _a.onHistoryChange((topic) => {
          if (topic === this.ANNOTATION_HISTORY_TOPIC && this.config.autoCommit !== false) {
            this.commit()
          }
        })
    ;(_b = this.interactionManager) == null
      ? void 0
      : _b.onModeChange((s) => {
          var _a2
          const newToolId =
            ((_a2 = (this.state as AnnotationState).tools.find(
              (t: AnnotationTool) => (t.interaction.mode ?? t.id) === s.activeMode,
            )) == null
              ? void 0
              : _a2.id) ?? null
          if (newToolId !== (this.state as AnnotationState).activeToolId) {
            this.dispatch(setActiveToolId(newToolId))
          }
        })
    ;(_c = this.selection) == null
      ? void 0
      : _c.onEndSelection(() => {
          var _a2, _b2, _c2
          const activeTool = this.getActiveTool()
          if (!activeTool || !activeTool.interaction.textSelection) return
          const formattedSelection =
            (_a2 = this.selection) == null ? void 0 : _a2.getFormattedSelection()
          const selectionText = (_b2 = this.selection) == null ? void 0 : _b2.getSelectedText()
          if (!formattedSelection || !selectionText) return
          for (const selection of formattedSelection) {
            selectionText.wait((_text) => {
              const annotationId = uuidV4()
              this.createAnnotation(selection.pageIndex, {
                type: activeTool.type,
                color: activeTool.color,
                rect: selection.rect,
                segmentRects: selection.segmentRects,
                pageIndex: selection.pageIndex,
                created: /* @__PURE__ */ new Date(),
                id: annotationId,
                opacity: activeTool.opacity,
              })
              // tool behavior after creating an annotation
              if (this.getToolBehavior(activeTool, "deactivateToolAfterCreate")) {
                this.setActiveTool(null)
              }
              if (this.getToolBehavior(activeTool, "selectAfterCreate")) {
                this.selectAnnotation(selection.pageIndex, annotationId)
              }
            }, ignore)
          }
          ;(_c2 = this.selection) == null ? void 0 : _c2.clear()
        })
  }

  // capabilitiy functions to enable the client program to...
  buildCapability(): AnnotationCapability {
    return {
      // to act on active tool change, state change, or event
      onStateChange: this.state$.on,
      onActiveToolChange: this.activeTool$.on,
      onAnnotationEvent: this.events$.on,
      // to modify an annotation
      createAnnotation: (pageIndex: number, anno: PdfAnnotationObject) =>
        this.createAnnotation(pageIndex, anno),
      deleteAnnotation: (pageIndex: number, id: string) => this.deleteAnnotation(pageIndex, id),
      recolorAnnotation: (uid: string, color: string) => this.recolorAnnotation(uid, color),
      commit: () => this.commit(),
      // to change selected annotation
      getSelectedAnnotation: () => {
        const selectedUid = (this.state as AnnotationState).selectedUid
        return selectedUid ? (this.state as AnnotationState).byUid[selectedUid] : null
      },
      selectAnnotation: (pageIndex: number, id: string) =>
        this.dispatch(selectAnnotation(pageIndex, id)),
      deselectAnnotation: () => this.dispatch(deselectAnnotation()),
      // to set active tool
      getActiveTool: () => this.getActiveTool(),
      setActiveTool: (toolId: string | null) => this.setActiveTool(toolId),
      // to import and export annotations
      importAnnotations: (items: Array<{ annotation: PdfAnnotationObject }>) =>
        this.importAnnotations(items),
      getPageAnnotations: (options: { pageIndex: number }) => this.getPageAnnotations(options),
      exportAnnotations: () => this.exportAnnotationsToJSON(),
    }
  }

  createAnnotation(pageIndex: number, annotation: PdfAnnotationObject) {
    const id = annotation.id
    const newAnnotation = {
      ...annotation,
      author: annotation.author ?? this.config.annotationAuthor,
    }
    const execute = () => {
      this.dispatch(createAnnotation(pageIndex, newAnnotation))
      this.events$.emit({
        type: "create",
        annotation: newAnnotation,
        pageIndex,
        committed: false,
      })
    }
    if (!this.history) {
      execute()
      if (this.config.autoCommit) this.commit()
      return
    }
    const command = {
      execute,
      undo: () => {
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
  deleteAnnotation(pageIndex: number, id: string) {
    var _a
    const originalAnnotation =
      (_a = (this.state as AnnotationState).byUid[id]) == null ? void 0 : _a.object
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
    const command = {
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
  recolorAnnotation(uid: string, color: string) {
    const trackedAnnotation = (this.state as AnnotationState).byUid[uid]
    if (!trackedAnnotation) {
      return
    }
    const annotation = trackedAnnotation.object
    const pageIndex = annotation.pageIndex
    this.dispatch(recolorAnnotation(uid, color))
    this.events$.emit({
      type: "update",
      annotation: annotation,
      pageIndex,
      committed: false,
    })
  }
  commit() {
    const task = new Task()
    if (!(this.state as AnnotationState).hasPendingChanges) return PdfTaskHelper.resolve(true)
    const doc = this.coreState.core.document
    if (!doc)
      return PdfTaskHelper.reject({
        code: PdfErrorCode.NotFound,
        message: "Document not found",
      })
    const creations: any[] = []
    const updates: any[] = []
    const deletions: Array<{ ta: TrackedAnnotation; uid: string }> = []
    for (const [uid, ta] of Object.entries((this.state as AnnotationState).byUid)) {
      if (ta.commitState === "synced") continue
      const page = doc.pages.find((p) => p.index === ta.object.pageIndex)
      if (!page) continue
      switch (ta.commitState) {
        case "new":
          const createTask = new Task()
          createTask.wait(() => {
            this.events$.emit({
              type: "create",
              annotation: ta.object,
              pageIndex: ta.object.pageIndex,
              committed: true,
            })
          }, ignore)
          creations.push(createTask)
          break
        case "dirty":
          const updateTask = this.engine.createPageAnnotation(doc, page, ta.object)
          updateTask.wait(() => {
            this.events$.emit({
              type: "update",
              annotation: ta.object,
              pageIndex: ta.object.pageIndex,
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
    const deletionTasks = []
    for (const { ta, uid } of deletions) {
      const page = doc.pages.find((p) => p.index === ta.object.pageIndex)
      if (ta.commitState === "deleted" && ta.object.id && page) {
        const deleteTask = new Task()
        const removeTask = this.engine.removePageAnnotation(doc, page, ta.object)
        removeTask.wait(() => {
          this.dispatch(purgeAnnotation(uid))
          this.events$.emit({
            type: "delete",
            annotation: ta.object,
            pageIndex: ta.object.pageIndex,
            committed: true,
          })
          deleteTask.resolve(true)
        }, deleteTask.fail)
        deletionTasks.push(deleteTask)
      } else {
        this.dispatch(purgeAnnotation(uid))
      }
    }
    const allWriteTasks = [...creations, ...updates, ...deletionTasks]
    Task.allSettled(allWriteTasks).wait(() => {
      this.dispatch(commitPendingChanges())
      task.resolve(true)
    }, task.fail)
    return task
  }

  // BasePlugin function needed to enable client programs to change the active tool
  onStoreUpdated(prev: AnnotationState, next: AnnotationState) {
    this.state$.emit(next)
    if (prev.activeToolId !== next.activeToolId || prev.tools !== next.tools) {
      this.activeTool$.emit(this.getActiveTool())
    }
  }
  getActiveTool(): AnnotationTool | null {
    if (!(this.state as AnnotationState).activeToolId) return null
    return (
      (this.state as AnnotationState).tools.find(
        (t: AnnotationTool) => t.id === (this.state as AnnotationState).activeToolId,
      ) ?? null
    )
  }
  setActiveTool(toolId: string | null) {
    var _a, _b
    if (toolId === (this.state as AnnotationState).activeToolId) return
    const tool = (this.state as AnnotationState).tools.find((t: AnnotationTool) => t.id === toolId)
    if (tool) {
      ;(_a = this.interactionManager) == null
        ? void 0
        : _a.activate(tool.interaction.mode ?? tool.id)
    } else {
      ;(_b = this.interactionManager) == null ? void 0 : _b.activateDefaultMode()
    }
  }
  getToolBehavior(tool: AnnotationTool, setting: string): boolean {
    var _a
    if (tool.behavior && (_a = tool.behavior[setting as keyof typeof tool.behavior]) !== void 0) {
      return (tool.behavior[setting as keyof typeof tool.behavior] as boolean) ?? false
    }
    return (this.config as Record<string, boolean | undefined>)[setting] !== false
  }
  selectAnnotation(pageIndex: number, id: string) {
    this.dispatch(selectAnnotation(pageIndex, id))
  }
  /** loadExistingAnnotations... getPageAnnotations may not be working */
  loadExistingAnnotations(doc: any) {
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
  processImportQueue() {
    if (this.importQueue.length === 0) return
    const items = [...this.importQueue]
    this.importQueue = []
    this.processImportItems(items)
  }
  importAnnotations(items: Array<{ annotation: PdfAnnotationObject }>) {
    if (!this.isInitialLoadComplete) {
      this.importQueue.push(...items)
      return
    }
    this.processImportItems(items)
  }
  processImportItems(items: Array<{ annotation: PdfAnnotationObject }>) {
    for (const item of items) {
      const { annotation } = item
      const pageIndex = annotation.pageIndex
      this.dispatch(createAnnotation(pageIndex, annotation))
    }
    if (this.config.autoCommit !== false) this.commit()
  }
  getPageAnnotations(options: { pageIndex: number }) {
    const { pageIndex } = options
    const doc = this.coreState.core.document
    if (!doc) {
      return PdfTaskHelper.reject({
        code: PdfErrorCode.NotFound,
        message: "Document not found",
      })
    }
    const page = doc.pages.find((p) => p.index === pageIndex)
    if (!page) {
      return PdfTaskHelper.reject({
        code: PdfErrorCode.NotFound,
        message: "Page not found",
      })
    }
    return this.engine.getPageAnnotations(doc, page)
  }
  exportAnnotationsToJSON() {
    const annotations = Object.values((this.state as AnnotationState).byUid).map(
      (ta: TrackedAnnotation) => ta.object,
    )
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

// ***MANIFEST***
const manifest: PluginManifest<AnnotationPluginConfig> = {
  id: ANNOTATION_PLUGIN_ID,
  name: "Annotation Plugin",
  version: "1.0.0",
  provides: [ANNOTATION_PLUGIN_ID],
  requires: ["history", "interaction-manager", "selection"],
  optional: [],
  defaultConfig: {
    enabled: true,
    autoCommit: true,
    annotationAuthor: "Guest",
    deactivateToolAfterCreate: false,
    selectAfterCreate: true,
  },
}

// ***PLUGIN PACKAGE***
export const AnnotationPluginPackage: PluginPackage<
  AnnotationPlugin,
  AnnotationPluginConfig,
  AnnotationState,
  AnnotationAction
> = {
  manifest,
  create: (registry: PluginRegistry, config: AnnotationPluginConfig) =>
    new AnnotationPlugin(ANNOTATION_PLUGIN_ID, registry, config),
  reducer,
  initialState: (_, config: AnnotationPluginConfig) => initialState(config),
}

// ***PLUGIN HOOKS***
export const useAnnotationPlugin = () => usePlugin(ANNOTATION_PLUGIN_ID)
export const useAnnotationCapability = () => useCapability(ANNOTATION_PLUGIN_ID)

// *****HELPER FUNCTIONS*****
// Helper functions to get annotations by page and exported functions for client program to get annotations
const getAnnotationsByPageIndex = (s: AnnotationState, page: number): TrackedAnnotation[] =>
  (s.pages[page] ?? []).map((uid: string) => s.byUid[uid])
const getSelectedAnnotationByPageIndex = (
  s: AnnotationState,
  pageIndex: number,
): TrackedAnnotation | null => {
  if (!s.selectedUid) return null
  const pageUids = s.pages[pageIndex] ?? []
  if (pageUids.includes(s.selectedUid)) {
    return s.byUid[s.selectedUid]
  }
  return null
}

// *****COMPONENTS******
// annotation subtype renderers
function Highlight(props: {
  color?: string
  opacity?: number
  segmentRects: Array<{
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }>
  rect?: {
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }
  scale: number
  onClick?: (e: React.MouseEvent) => void
  style?: React.CSSProperties
}) {
  const { color = "#FFCD45", opacity = 0.4, segmentRects, rect, scale, onClick, style } = props
  if (!Array.isArray(segmentRects)) {
    return null
  }

  return /* @__PURE__ */ jsxs(Fragment, {
    children: segmentRects.map((b, i) =>
      /* @__PURE__ */ jsx(
        "div",
        {
          onPointerDown: onClick,
          onTouchStart: onClick,
          style: {
            position: "absolute",
            left: (rect ? b.origin.x - rect.origin.x : b.origin.x) * scale,
            top: (rect ? b.origin.y - rect.origin.y : b.origin.y) * scale,
            width: Math.max(b.size.width * scale, 1),
            height: Math.max(b.size.height * scale, 1),
            background: color,
            opacity,
            pointerEvents: onClick ? "auto" : "none",
            cursor: onClick ? "pointer" : "default",
            zIndex: onClick ? 1 : void 0,
            ...style,
          },
        },
        `highlight-segment-${i}`,
      ),
    ),
  })
}
function Underline(props: {
  color?: string
  opacity?: number
  segmentRects: Array<{
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }>
  rect?: {
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }
  scale: number
  onClick?: (e: React.MouseEvent) => void
  style?: React.CSSProperties
}) {
  const { color = "#E44234", opacity = 1, segmentRects, rect, scale, onClick, style } = props
  const thickness = 2 * scale
  if (!Array.isArray(segmentRects)) {
    return null
  }

  return /* @__PURE__ */ jsxs(Fragment, {
    children: segmentRects.map((r, i) =>
      /* @__PURE__ */ jsx(
        "div",
        {
          onPointerDown: onClick,
          onTouchStart: onClick,
          style: {
            position: "absolute",
            left: (rect ? r.origin.x - rect.origin.x : r.origin.x) * scale,
            top: (rect ? r.origin.y - rect.origin.y : r.origin.y) * scale,
            width: Math.max(r.size.width * scale, 1),
            height: Math.max(r.size.height * scale, 1),
            background: "transparent",
            pointerEvents: onClick ? "auto" : "none",
            cursor: onClick ? "pointer" : "default",
            zIndex: onClick ? 1 : 0,
            ...style,
          },
          children: /* @__PURE__ */ jsx("div", {
            style: {
              position: "absolute",
              left: 0,
              bottom: 0,
              width: "100%",
              height: thickness,
              background: color,
              opacity,
              pointerEvents: "none",
            },
          }),
        },
        `underline-segment-${i}`,
      ),
    ),
  })
}
function Squiggly(props: {
  color?: string
  opacity?: number
  segmentRects: Array<{
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }>
  rect?: {
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }
  scale: number
  onClick?: (e: React.MouseEvent) => void
  style?: React.CSSProperties
}) {
  const { color = "#E44234", opacity = 1, segmentRects, rect, scale, onClick, style } = props
  const amplitude = 2 * scale
  const period = 6 * scale
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${period}" height="${amplitude * 2}" viewBox="0 0 ${period} ${amplitude * 2}">
      <path d="M0 ${amplitude} Q ${period / 4} 0 ${period / 2} ${amplitude} T ${period} ${amplitude}"
            fill="none" stroke="${color}" stroke-width="${amplitude}" stroke-linecap="round"/>
    </svg>`
  const svgDataUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
  if (!Array.isArray(segmentRects)) {
    return null
  }

  return /* @__PURE__ */ jsxs(Fragment, {
    children: segmentRects.map((r, i) =>
      /* @__PURE__ */ jsx(
        "div",
        {
          onPointerDown: onClick,
          onTouchStart: onClick,
          style: {
            position: "absolute",
            left: (rect ? r.origin.x - rect.origin.x : r.origin.x) * scale,
            top: (rect ? r.origin.y - rect.origin.y : r.origin.y) * scale,
            width: Math.max(r.size.width * scale, 1),
            height: Math.max(r.size.height * scale, 1),
            background: "transparent",
            pointerEvents: onClick ? "auto" : "none",
            cursor: onClick ? "pointer" : "default",
            zIndex: onClick ? 1 : 0,
            ...style,
          },
          children: /* @__PURE__ */ jsx("div", {
            style: {
              position: "absolute",
              left: 0,
              bottom: 0,
              width: "100%",
              height: amplitude * 2,
              backgroundImage: svgDataUri,
              backgroundRepeat: "repeat-x",
              backgroundSize: `${period}px ${amplitude * 2}px`,
              opacity,
              pointerEvents: "none",
            },
          }),
        },
        `squiggly-segment-${i}`,
      ),
    ),
  })
}

// component so an annotation is outlined when selected
function AnnotationOutline(props: {
  scale: number
  trackedAnnotation: TrackedAnnotation
  children?: () => React.ReactNode
  isSelected: boolean
  style?: React.CSSProperties
  selectionOutlineColor?: string
  selectionOutlineWidth?: number
  selectionOutlineOffset?: number
  zIndex?: number
  onClick?: (e: React.MouseEvent) => void
}) {
  const {
    scale,
    trackedAnnotation,
    children,
    isSelected,
    style,
    selectionOutlineColor,
    selectionOutlineWidth,
    selectionOutlineOffset,
    zIndex,
  } = {
    style: {},
    selectionOutlineColor: "#007ACC",
    selectionOutlineWidth: 2,
    selectionOutlineOffset: 1,
    zIndex: 1,
    ...props,
  }
  const currentObject = trackedAnnotation?.object

  // Call children function to render the annotation content inside the outline
  const annotationContent = children ? children() : null

  return /* @__PURE__ */ jsxs("div", {
    "data-no-interaction": true,
    children: [
      /* @__PURE__ */ jsx("div", {
        style: {
          position: "absolute",
          left: currentObject?.rect?.origin?.x * scale || 0,
          top: currentObject?.rect?.origin?.y * scale || 0,
          width: currentObject?.rect?.size?.width * scale || 0,
          height: currentObject?.rect?.size?.height * scale || 0,
          outline: isSelected
            ? `${selectionOutlineWidth}px solid ${selectionOutlineColor}`
            : "none",
          outlineOffset: isSelected ? `${selectionOutlineOffset}px` : "0px",
          pointerEvents: isSelected ? "auto" : "none",
          touchAction: "none",
          cursor: isSelected ? "move" : "default",
          zIndex,
          ...style,
        },
        children: annotationContent,
      }),
    ],
  })
}

// component to render annotations and outlines
function Annotations(props: {
  pageIndex: number
  scale: number
  pageWidth: number
  pageHeight: number
}) {
  const { pageIndex, scale } = props
  const { provides: annotationProvides } = useAnnotationCapability()
  const { provides: selectionProvides } = useSelectionCapability()
  const [annotations, setAnnotations] = useState<TrackedAnnotation[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<TrackedAnnotation | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (!annotationProvides) return

    const unsubscribe = annotationProvides.onStateChange((state: AnnotationState) => {
      if (state) {
        const pageAnnotations = getAnnotationsByPageIndex(state, pageIndex)
        setAnnotations(pageAnnotations)
        setSelectedAnnotation(getSelectedAnnotationByPageIndex(state, pageIndex))
      } else {
        setAnnotations([])
        setSelectedAnnotation(null)
      }
    })

    return unsubscribe
  }, [annotationProvides, pageIndex])

  const handleClick = useCallback(
    (e: React.MouseEvent, annotation: PdfAnnotationObject) => {
      e.stopPropagation()
      if (annotationProvides && selectionProvides) {
        annotationProvides.selectAnnotation(pageIndex, annotation.id)
        selectionProvides.clear()
        if (annotation.id !== editingId) {
          setEditingId(null)
        }
      }
    },
    [annotationProvides, selectionProvides, editingId, pageIndex],
  )

  return /* @__PURE__ */ jsxs(Fragment, {
    children: annotations.map((annotation) => {
      const isSelected = selectedAnnotation?.object.id === annotation.object.id

      if (annotation.object.type === PdfAnnotationSubtype.HIGHLIGHT) {
        return /* @__PURE__ */ jsx(
          AnnotationOutline,
          {
            scale,
            trackedAnnotation: annotation,
            isSelected,
            onClick: (e: React.MouseEvent) => handleClick(e, annotation.object),
            zIndex: 0,
            children: () =>
              /* @__PURE__ */ jsx(Highlight, {
                color: annotation.object.color,
                segmentRects: annotation.object.segmentRects || [],
                rect: annotation.object.rect,
                scale,
                onClick: (e: React.MouseEvent) => handleClick(e, annotation.object),
              }),
          },
          `highlight-${annotation.object.id}`,
        )
      }
      if (annotation.object.type === PdfAnnotationSubtype.UNDERLINE) {
        return /* @__PURE__ */ jsx(
          AnnotationOutline,
          {
            scale,
            trackedAnnotation: annotation,
            isSelected,
            onClick: (e: React.MouseEvent) => handleClick(e, annotation.object),
            zIndex: 0,
            children: () =>
              /* @__PURE__ */ jsx(Underline, {
                color: annotation.object.color,
                segmentRects: annotation.object.segmentRects || [],
                rect: annotation.object.rect,
                scale,
                onClick: (e: React.MouseEvent) => handleClick(e, annotation.object),
              }),
          },
          `underline-${annotation.object.id}`,
        )
      }
      if (annotation.object.type === PdfAnnotationSubtype.SQUIGGLY) {
        return /* @__PURE__ */ jsx(
          AnnotationOutline,
          {
            scale,
            trackedAnnotation: annotation,
            isSelected,
            onClick: (e: React.MouseEvent) => handleClick(e, annotation.object),
            zIndex: 0,
            children: () =>
              /* @__PURE__ */ jsx(Squiggly, {
                color: annotation.object.color,
                segmentRects: annotation.object.segmentRects || [],
                rect: annotation.object.rect,
                scale,
                onClick: (e: React.MouseEvent) => handleClick(e, annotation.object),
              }),
          },
          `squiggly-${annotation.object.id}`,
        )
      }
      return null
    }),
  })
}

// component to render preview while user is selecting text and a text markup tool is active
function TextMarkupPreview(props: { pageIndex: number; scale: number }) {
  const { pageIndex, scale } = props
  const { provides: selectionProvides } = useSelectionCapability()
  const { provides: annotationProvides } = useAnnotationCapability()
  const [rects, setRects] = useState<Rect[]>([])
  const [boundingRect, setBoundingRect] = useState<Rect | null>(null)
  const [activeTool, setActiveTool] = useState<AnnotationTool | null>(null)

  useEffect(() => {
    if (!selectionProvides) return

    const unsubscribe = selectionProvides.onSelectionChange(() => {
      const highlightRects = selectionProvides.getHighlightRectsForPage(pageIndex)
      setRects(Array.isArray(highlightRects) ? highlightRects : [])
      setBoundingRect(selectionProvides.getBoundingRectForPage(pageIndex))
    })

    return unsubscribe
  }, [selectionProvides, pageIndex])

  useEffect(() => {
    if (!annotationProvides) return

    const unsubscribe = annotationProvides.onActiveToolChange(setActiveTool)
    return unsubscribe
  }, [annotationProvides])

  if (!boundingRect) return null
  if (!activeTool) return null

  switch (activeTool.type) {
    case PdfAnnotationSubtype.HIGHLIGHT:
      return /* @__PURE__ */ jsx("div", {
        style: {
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
        },
        children: /* @__PURE__ */ jsx(Highlight, {
          color: activeTool.color,
          opacity: activeTool.opacity,
          segmentRects: rects,
          scale,
        }),
      })
    case PdfAnnotationSubtype.UNDERLINE:
      return /* @__PURE__ */ jsx("div", {
        style: {
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
        },
        children: /* @__PURE__ */ jsx(Underline, {
          color: activeTool.color,
          opacity: activeTool.opacity,
          segmentRects: rects,
          scale,
        }),
      })
    case PdfAnnotationSubtype.SQUIGGLY:
      return /* @__PURE__ */ jsx("div", {
        style: {
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
        },
        children: /* @__PURE__ */ jsx(Squiggly, {
          color: activeTool.color,
          opacity: activeTool.opacity,
          segmentRects: rects,
          scale,
        }),
      })
    default:
      return null
  }
}

// Main component for client program to include inside pdf container
export function AnnotationLayer(props: {
  style?: React.CSSProperties
  pageIndex: number
  scale: number
  pageWidth: number
  pageHeight: number
  [key: string]: unknown
}) {
  const { style, pageIndex, scale, pageWidth, pageHeight, ...restProps } = props
  return /* @__PURE__ */ jsxs("div", {
    style: {
      ...style,
    },
    ...restProps,
    children: [
      /* @__PURE__ */ jsx(Annotations, {
        pageIndex,
        scale,
        pageWidth,
        pageHeight,
      }),
      /* @__PURE__ */ jsx(TextMarkupPreview, { pageIndex, scale }),
    ],
  })
}
