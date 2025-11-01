/// <reference types="hammerjs" />
import type { CSSProperties, HTMLAttributes, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { jsx } from "react/jsx-runtime"
import "../../../lib/hammer/hammer.js"
import {
  Action,
  BasePlugin,
  BasePluginConfig,
  clamp,
  createBehaviorEmitter,
  createEmitter,
  type EventHook,
  getPagesWithRotatedSize,
  type PluginManifest,
  PluginPackage,
  PluginRegistry,
  Rect,
  type Reducer,
  rotateRect,
  SET_DOCUMENT,
  SET_PAGES,
  SET_ROTATION,
  setScale,
  Size,
  useCapability,
  usePlugin,
} from "../core"
import {
  INTERACTION_MANAGER_PLUGIN_ID,
  InteractionManagerCapability,
  PdfPointerEvent,
  PointerEventHandlersWithLifecycle,
} from "../plugin-interaction-manager"
import { SCROLL_PLUGIN_ID, ScrollCapability } from "../plugin-scroll"
import { VIEWPORT_PLUGIN_ID, ViewportCapability, ViewportMetrics } from "../plugin-viewport"

// *****CUSTOM TYPES******
// ***EVENTS***
export interface ZoomChangeEvent {
  /** old and new *actual* scale factors */
  oldZoom: number
  newZoom: number
  /** level used to obtain the newZoom (number | mode) */
  level: ZoomLevel
  /** viewport point kept under the finger / mouse‑wheel focus */
  center: Point
  /** where the viewport should scroll to after the scale change */
  desiredScrollLeft: number
  desiredScrollTop: number
  /** metrics at the moment the zoom was requested                    */
  viewport: ViewportMetrics
}

// ***OTHER CUSTOM TYPES***
export enum ZoomMode {
  Automatic = "automatic",
  FitPage = "fit-page",
  FitWidth = "fit-width",
}

export type ZoomLevel = ZoomMode | number

export interface Point {
  vx: number
  vy: number
}

export interface ZoomRangeStep {
  min: number
  max: number
  step: number
}

export interface ZoomPreset {
  name: string
  value: ZoomLevel
  icon?: string
}

export enum VerticalZoomFocus {
  Center = 0,
  Top = 1,
}

export interface ZoomRequest {
  level: ZoomLevel
  delta?: number
  center?: Point
  focus?: VerticalZoomFocus
  /** Scroll so that the focal point ends up …
   *  ▸ `"keep"`   (default) at the same viewport coords
   *  ▸ `"center"` centred in the viewport  */
  align?: "keep" | "center"
}

type PinchWrapperProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  children: ReactNode
  style?: CSSProperties
}

export interface PinchZoomDeps {
  element: HTMLDivElement
  viewportProvides: ViewportCapability
  zoomProvides: ZoomCapability
}

/**
 * Interface for the Viewer API that allows plugins to expose methods
 * directly on the viewer's ref.
 */
export interface ViewerApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addRefMethod(name: string, method: (...args: any[]) => any): void
}

/**
 * Interface for plugins that wish to attach methods to the Viewer API.
 * The PdfViewer component will call `attachViewerApi` on such plugins.
 */
export interface ViewerRefMethodsAttachable {
  attachViewerApi?(viewerApi: ViewerApi): void
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const ZOOM_PLUGIN_ID = "zoom"

// ***STATE***
export interface ZoomState {
  zoomLevel: ZoomLevel
  currentZoomLevel: number
}

// ***INITIAL STATE***
const initialState: ZoomState = {
  zoomLevel: ZoomMode.Automatic,
  currentZoomLevel: 1,
}

// ***ACTION CONSTANTS***
const SET_ZOOM_LEVEL = "SET_ZOOM_LEVEL"
const SET_INITIAL_ZOOM_LEVEL = "SET_INITIAL_ZOOM_LEVEL"

// ***ACTION INTERFaces***
interface SetZoomLevelAction extends Action {
  type: typeof SET_ZOOM_LEVEL
  payload: {
    zoomLevel: ZoomLevel
    currentZoomLevel: number
  }
}

interface SetInitialZoomLevelAction extends Action {
  type: typeof SET_INITIAL_ZOOM_LEVEL
  payload: {
    zoomLevel: ZoomLevel
  }
}

// ***ACTION UNION***
export type ZoomAction = SetZoomLevelAction | SetInitialZoomLevelAction

// ***ACTION CREATORS***
function setZoomLevel(zoomLevel: ZoomLevel, currentZoomLevel: number): SetZoomLevelAction {
  return {
    type: SET_ZOOM_LEVEL,
    payload: { zoomLevel, currentZoomLevel },
  }
}

function setInitialZoomLevel(zoomLevel: ZoomLevel): SetInitialZoomLevelAction {
  return {
    type: SET_INITIAL_ZOOM_LEVEL,
    payload: { zoomLevel },
  }
}

// ***ACTION REDUCER***
const zoomReducer: Reducer<ZoomState, ZoomAction> = (state = initialState, action: ZoomAction) => {
  switch (action.type) {
    case SET_ZOOM_LEVEL:
      return {
        ...state,
        zoomLevel: action.payload.zoomLevel,
        currentZoomLevel: action.payload.currentZoomLevel,
      }
    case SET_INITIAL_ZOOM_LEVEL:
      return {
        ...state,
        zoomLevel: action.payload.zoomLevel,
      }
    default:
      return state
  }
}

// ***PLUGIN CAPABILITY***
export interface ZoomCapability {
  /** subscribe – returns the unsubscribe function */
  onZoomChange: EventHook<ZoomChangeEvent>
  /** subscribe – returns the unsubscribe function */
  onStateChange: EventHook<ZoomState>
  /** absolute requests -------------------------------------------------- */
  requestZoom(level: ZoomLevel, center?: Point): void
  /** relative requests -------------------------------------------------- */
  requestZoomBy(delta: number, center?: Point): void
  /** absolute requests -------------------------------------------------- */
  zoomIn(): void
  zoomOut(): void
  zoomToArea(pageIndex: number, rect: Rect): void
  getState(): ZoomState
  getPresets(): ZoomPreset[]
}

// ***PLUGIN CONFIG***
export interface ZoomPluginConfig extends BasePluginConfig {
  defaultZoomLevel: ZoomLevel
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
  zoomRanges?: ZoomRangeStep[]
  presets?: ZoomPreset[]
}

// ***PLUGIN CLASS***
export class ZoomPlugin
  extends BasePlugin<ZoomPluginConfig, ZoomCapability, ZoomState, ZoomAction>
  implements ViewerRefMethodsAttachable
{
  static readonly id: string = ZOOM_PLUGIN_ID

  private readonly zoom$ = createEmitter<ZoomChangeEvent>()
  private readonly state$ = createBehaviorEmitter<ZoomState>(this.state)
  private readonly viewport: ViewportCapability
  private readonly viewportPlugin: any
  private readonly scroll: ScrollCapability | null
  private readonly interactionManager: InteractionManagerCapability | null
  private readonly presets: ZoomPreset[]
  private readonly zoomRanges: ZoomRangeStep[]
  private readonly minZoom: number
  private readonly maxZoom: number
  private readonly zoomStep: number

  constructor(id: string, registry: PluginRegistry, cfg: ZoomPluginConfig) {
    super(id, registry, zoomReducer)
    this.viewportPlugin = registry.getPlugin(VIEWPORT_PLUGIN_ID)
    this.viewport = this.viewportPlugin.provides()
    const scrollPlugin = registry.getPlugin(SCROLL_PLUGIN_ID)
    this.scroll = scrollPlugin?.provides?.() ?? null
    const interactionManager = registry.getPlugin(INTERACTION_MANAGER_PLUGIN_ID)
    this.interactionManager = interactionManager?.provides?.() ?? null
    this.minZoom = cfg.minZoom ?? 0.25
    this.maxZoom = cfg.maxZoom ?? 10
    this.zoomStep = cfg.zoomStep ?? 0.1
    this.presets = cfg.presets ?? []
    this.zoomRanges = this.normalizeRanges(cfg.zoomRanges ?? [])
    this.dispatch(setInitialZoomLevel(cfg.defaultZoomLevel))
    this.viewport.onViewportResize(() => this.recalcAuto(VerticalZoomFocus.Top))
    this.coreStore.onAction(SET_ROTATION, () => this.recalcAuto(VerticalZoomFocus.Top))
    this.coreStore.onAction(SET_PAGES, () => this.recalcAuto(VerticalZoomFocus.Top))
  }

  public attachViewerApi(viewerApi: ViewerApi): void {
    viewerApi.addRefMethod("zoomIn", this.zoomIn.bind(this))
    viewerApi.addRefMethod("zoomOut", this.zoomOut.bind(this))
  }

  protected buildCapability(): ZoomCapability {
    return {
      onZoomChange: this.zoom$.on,
      onStateChange: this.state$.on,
      zoomIn: () => this.zoomIn(),
      zoomOut: () => this.zoomOut(),
      zoomToArea: (pageIndex, rect) => this.zoomToArea(pageIndex, rect),
      requestZoom: (level, c) => this.handleRequest({ level, center: c }),
      requestZoomBy: (d, c) => {
        const cur = this.state.currentZoomLevel
        const target = this.toZoom(cur + d)
        return this.handleRequest({ level: target, center: c })
      },
      getState: () => this.state,
      getPresets: () => this.presets,
    }
  }

  private zoomIn(): void {
    const currentZoom = this.state.currentZoomLevel
    const newZoom = this.toZoom(currentZoom + this.zoomStep)
    this.handleRequest({ level: newZoom })
  }

  private zoomOut(): void {
    const currentZoom = this.state.currentZoomLevel
    const newZoom = this.toZoom(currentZoom - this.zoomStep)
    this.handleRequest({ level: newZoom })
  }

  private handleRequest(request: ZoomRequest): void {
    const oldZoom = this.state.currentZoomLevel
    let newZoom: number

    if (typeof request.level === "number") {
      newZoom = clamp(request.level, this.minZoom, this.maxZoom)
    } else {
      // NOTE: A full implementation for ZoomMode.Automatic, etc. is required here.
      // For now, we default to a standard zoom level as a placeholder.
      newZoom = 1.0
    }

    // A real implementation would involve calculating scroll positions based on the focal point.
    if (newZoom !== oldZoom) {
      this.dispatch(setZoomLevel(request.level, newZoom))
      this.coreStore.dispatch(setScale(newZoom))

      this.zoom$.emit({
        oldZoom: oldZoom,
        newZoom: newZoom,
        level: request.level,
        center: request.center ?? { vx: 0, vy: 0 },
        desiredScrollLeft: this.scroll?.getScrollLeft() ?? 0,
        desiredScrollTop: this.scroll?.getScrollTop() ?? 0,
        viewport: this.viewport.getViewportMetrics(),
      })
    }
  }

  private zoomToArea(pageIndex: number, rect: Rect): void {
    // A full implementation would calculate the required scale and scroll position to fit the rect into the viewport.
    const viewportMetrics = this.viewport.getViewportMetrics()
    const scaleX = viewportMetrics.width / rect.width
    const scaleY = viewportMetrics.height / rect.height
    const newZoom = Math.min(scaleX, scaleY) * this.state.currentZoomLevel

    this.handleRequest({ level: newZoom })
  }

  private toZoom(value: number): number {
    // This function can be expanded to snap to predefined zoom levels.
    return clamp(value, this.minZoom, this.maxZoom)
  }

  private normalizeRanges(ranges: ZoomRangeStep[]): ZoomRangeStep[] {
    // Placeholder implementation.
    return ranges
  }

  private recalcAuto(focus: VerticalZoomFocus): void {
    // Recalculates zoom if a dynamic zoom mode is active (e.g., fit-to-width).
    if (
      this.state.zoomLevel === ZoomMode.Automatic ||
      this.state.zoomLevel === ZoomMode.FitPage ||
      this.state.zoomLevel === ZoomMode.FitWidth
    ) {
      this.handleRequest({ level: this.state.zoomLevel, focus })
    }
  }
}