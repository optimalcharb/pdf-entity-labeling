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
  useCapability,
  usePlugin,
} from "../core"
import {
  INTERACTION_MANAGER_PLUGIN_ID,
  InteractionManagerCapability,
  InteractionManagerPlugin,
} from "../plugin-interaction-manager"
import { SCROLL_PLUGIN_ID, ScrollCapability, ScrollPlugin } from "../plugin-scroll"
import {
  VIEWPORT_PLUGIN_ID,
  ViewportCapability,
  ViewportMetrics,
  ViewportPlugin,
} from "../plugin-viewport"

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

// ***ACTION INTERFACES***
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
const reducer: Reducer<ZoomState, ZoomAction> = (state = initialState, action: ZoomAction) => {
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
export class ZoomPlugin extends BasePlugin<
  ZoomPluginConfig,
  ZoomCapability,
  ZoomState,
  ZoomAction
> {
  static readonly id: string = ZOOM_PLUGIN_ID

  private readonly zoom$ = createEmitter<ZoomChangeEvent>()
  private readonly state$ = createBehaviorEmitter<ZoomState>()
  private readonly viewport: ViewportCapability
  private readonly viewportPlugin: ViewportPlugin
  private readonly scroll: ScrollCapability
  private readonly interactionManager: InteractionManagerCapability
  private readonly presets: ZoomPreset[]
  private readonly zoomRanges: ZoomRangeStep[]
  private readonly minZoom: number
  private readonly maxZoom: number
  private readonly zoomStep: number

  constructor(id: string, registry: PluginRegistry, cfg: ZoomPluginConfig) {
    super(id, registry)
    this.viewportPlugin = registry.getPlugin<ViewportPlugin>(VIEWPORT_PLUGIN_ID)!
    this.viewport = this.viewportPlugin.provides()
    this.scroll = registry.getPlugin<ScrollPlugin>(SCROLL_PLUGIN_ID)!.provides()
    this.interactionManager = registry
      .getPlugin<InteractionManagerPlugin>(INTERACTION_MANAGER_PLUGIN_ID)!
      .provides()
    this.minZoom = cfg.minZoom ?? 0.25
    this.maxZoom = cfg.maxZoom ?? 10
    this.zoomStep = cfg.zoomStep ?? 0.1
    this.presets = cfg.presets ?? []
    this.zoomRanges = this.normalizeRanges(cfg.zoomRanges ?? [])
    this.dispatch(setInitialZoomLevel(cfg.defaultZoomLevel))
    this.viewport.onViewportResize(() => this.recalcAuto(VerticalZoomFocus.Top))
    this.coreStore.onAction(SET_ROTATION, () => this.recalcAuto(VerticalZoomFocus.Top))
    this.coreStore.onAction(SET_PAGES, () => this.recalcAuto(VerticalZoomFocus.Top))
    this.coreStore.onAction(SET_DOCUMENT, () => this.recalcAuto(VerticalZoomFocus.Top))
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

  private zoomOut() {
    const cur = this.state.currentZoomLevel
    return this.handleRequest({ level: cur, delta: -this.stepFor(cur) })
  }

  private zoomIn() {
    const cur = this.state.currentZoomLevel
    return this.handleRequest({ level: cur, delta: this.stepFor(cur) })
  }

  private zoomToArea(pageIndex: number, rect: Rect) {
    this.handleZoomToArea(pageIndex, rect)
  }

  async initialize(): Promise<void> {}

  async destroy(): Promise<void> {
    this.zoom$.clear()
  }

  /**
   * Sort ranges once, make sure they are sane
   */
  private normalizeRanges(ranges: ZoomRangeStep[]): ZoomRangeStep[] {
    return [...ranges].filter((r) => r.step > 0 && r.max > r.min).sort((a, b) => a.min - b.min)
  }

  /** pick the step that applies to a given numeric zoom */
  private stepFor(zoom: number): number {
    const r = this.zoomRanges.find((r2) => zoom >= r2.min && zoom < r2.max)
    return r ? r.step : this.zoomStep
  }

  /** clamp + round helper reused later */
  private toZoom(v: number): number {
    return parseFloat(clamp(v, this.minZoom, this.maxZoom).toFixed(2))
  }

  /** main entry – handles **every** zoom request */
  private handleRequest({
    level,
    delta = 0,
    center,
    focus = VerticalZoomFocus.Center,
    align = "keep",
  }: ZoomRequest) {
    const metrics = this.viewport.getMetrics()
    const oldZoom = this.state.currentZoomLevel
    if (metrics.clientWidth === 0 || metrics.clientHeight === 0) {
      return
    }
    const base = typeof level === "number" ? level : this.computeZoomForMode(level, metrics)
    if (base === false) {
      return
    }
    const exactZoom = clamp(base + delta, this.minZoom, this.maxZoom)
    const newZoom = Math.floor(exactZoom * 100) / 100
    const focusPoint = center ?? {
      vx: metrics.clientWidth / 2,
      vy: focus === VerticalZoomFocus.Top ? 0 : metrics.clientHeight / 2,
    }
    const { desiredScrollLeft, desiredScrollTop } = this.computeScrollForZoomChange(
      metrics,
      oldZoom,
      newZoom,
      focusPoint,
      align,
    )
    if (!isNaN(desiredScrollLeft) && !isNaN(desiredScrollTop)) {
      this.viewportPlugin.setViewportScrollMetrics?.({
        scrollLeft: desiredScrollLeft,
        scrollTop: desiredScrollTop,
      })
    }
    this.dispatch(setZoomLevel(typeof level === "number" ? newZoom : level, newZoom))
    this.dispatchCoreAction(setScale(newZoom))
    this.markReady()
    this.viewport.scrollTo({
      x: desiredScrollLeft,
      y: desiredScrollTop,
      behavior: "instant",
    })
    const evt: ZoomChangeEvent = {
      oldZoom,
      newZoom,
      level,
      center: focusPoint,
      desiredScrollLeft,
      desiredScrollTop,
      viewport: metrics,
    }
    this.zoom$.emit(evt)
  }

  /** numeric zoom for Automatic / FitPage / FitWidth */
  private computeZoomForMode(mode: ZoomMode, vp: ViewportMetrics): number | false {
    const spreads = getPagesWithRotatedSize(this.coreState.core)
    if (!spreads.length) return false
    const pgGap = this.scroll.getPageGap()
    const vpGap = this.viewport.getViewportGap()
    if (vp.clientWidth === 0 || vp.clientHeight === 0) {
      return false
    }
    const availableWidth = vp.clientWidth - 2 * vpGap
    const availableHeight = vp.clientHeight - 2 * vpGap
    if (availableWidth <= 0 || availableHeight <= 0) {
      return false
    }
    let maxContentW = 0,
      maxContentH = 0
    spreads.forEach((spread) => {
      const contentW = spread.reduce((s, p, i) => s + p.rotatedSize.width + (i ? pgGap : 0), 0)
      const contentH = Math.max(...spread.map((p) => p.rotatedSize.height))
      maxContentW = Math.max(maxContentW, contentW)
      maxContentH = Math.max(maxContentH, contentH)
    })
    switch (mode) {
      case ZoomMode.FitWidth:
        return availableWidth / maxContentW
      case ZoomMode.FitPage:
        return Math.min(availableWidth / maxContentW, availableHeight / maxContentH)
      case ZoomMode.Automatic:
        return Math.min(availableWidth / maxContentW, 1)
      default:
        return 1
    }
  }

  /** where to scroll so that *focus* stays stable after scaling */
  private computeScrollForZoomChange(
    vp: ViewportMetrics,
    oldZoom: number,
    newZoom: number,
    focus: Point,
    align: "keep" | "center" = "keep",
  ) {
    const layout = this.scroll.getLayout()
    const vpGap = this.viewport.getViewportGap()
    const contentW = layout.totalContentSize.width
    const contentH = layout.totalContentSize.height
    const availableWidth = vp.clientWidth - 2 * vpGap
    const availableHeight = vp.clientHeight - 2 * vpGap
    const off = (availableSpace: number, cw: number, zoom: number) =>
      cw * zoom < availableSpace ? (availableSpace - cw * zoom) / 2 : 0
    const offXold = off(availableWidth, contentW, oldZoom)
    const offYold = off(availableHeight, contentH, oldZoom)
    const offXnew = off(availableWidth, contentW, newZoom)
    const offYnew = off(availableHeight, contentH, newZoom)
    const cx = (vp.scrollLeft + focus.vx - vpGap - offXold) / oldZoom
    const cy = (vp.scrollTop + focus.vy - vpGap - offYold) / oldZoom
    const baseLeft = cx * newZoom + vpGap + offXnew
    const baseTop = cy * newZoom + vpGap + offYnew
    const desiredScrollLeft =
      align === "center" ? baseLeft - vp.clientWidth / 2 : baseLeft - focus.vx
    const desiredScrollTop = align === "center" ? baseTop - vp.clientHeight / 2 : baseTop - focus.vy
    return {
      desiredScrollLeft: Math.max(0, desiredScrollLeft),
      desiredScrollTop: Math.max(0, desiredScrollTop),
    }
  }

  private handleZoomToArea(pageIndex: number, rect: Rect) {
    const rotation = this.coreState.core.rotation
    const vp = this.viewport.getMetrics()
    const vpGap = this.viewport.getViewportGap()
    const oldZ = this.state.currentZoomLevel
    const availableW = vp.clientWidth - 2 * vpGap
    const availableH = vp.clientHeight - 2 * vpGap
    const layout = this.scroll.getLayout()
    const vItem = layout.virtualItems.find((it: any) =>
      it.pageLayouts.some((p: any) => p.pageIndex === pageIndex),
    )
    if (!vItem) return
    const pageRel = vItem.pageLayouts.find((p: any) => p.pageIndex === pageIndex)
    if (!pageRel) return
    const rotatedRect = rotateRect(
      {
        width: pageRel.width,
        height: pageRel.height,
      },
      rect,
      rotation,
    )
    const targetZoom = this.toZoom(
      Math.min(availableW / rotatedRect.size.width, availableH / rotatedRect.size.height),
    )
    const pageAbsX = vItem.x + pageRel.x
    const pageAbsY = vItem.y + pageRel.y
    const cxContent = pageAbsX + rotatedRect.origin.x + rotatedRect.size.width / 2
    const cyContent = pageAbsY + rotatedRect.origin.y + rotatedRect.size.height / 2
    const off = (avail: number, cw: number, z: number) =>
      cw * z < avail ? (avail - cw * z) / 2 : 0
    const offXold = off(availableW, layout.totalContentSize.width, oldZ)
    const offYold = off(availableH, layout.totalContentSize.height, oldZ)
    const centerVX = vpGap + offXold + cxContent * oldZ - vp.scrollLeft
    const centerVY = vpGap + offYold + cyContent * oldZ - vp.scrollTop
    this.handleRequest({
      level: targetZoom,
      center: { vx: centerVX, vy: centerVY },
      align: "center",
    })
  }

  /** recalculates Automatic / Fit* when viewport or pages change */
  private recalcAuto(focus: VerticalZoomFocus) {
    const s = this.state
    if (
      s.zoomLevel === ZoomMode.Automatic ||
      s.zoomLevel === ZoomMode.FitPage ||
      s.zoomLevel === ZoomMode.FitWidth
    )
      this.handleRequest({ level: s.zoomLevel, focus })
  }

  onStoreUpdated(_prevState: ZoomState, newState: ZoomState): void {
    this.state$.emit(newState)
  }
}

// ***MANIFEST***
const manifest: PluginManifest<ZoomPluginConfig> = {
  id: ZOOM_PLUGIN_ID,
  name: "Zoom Plugin",
  version: "1.0.0",
  provides: [ZOOM_PLUGIN_ID],
  requires: ["viewport", "scroll"],
  optional: ["interaction-manager"],
  defaultConfig: {
    enabled: true,
    defaultZoomLevel: ZoomMode.Automatic,
    minZoom: 0.2,
    maxZoom: 60,
    zoomStep: 0.1,
    zoomRanges: [
      { min: 0.2, max: 0.5, step: 0.05 },
      { min: 0.5, max: 1, step: 0.1 },
      { min: 1, max: 2, step: 0.2 },
      { min: 2, max: 4, step: 0.4 },
      { min: 4, max: 10, step: 0.8 },
      { min: 10, max: 20, step: 1.6 },
      { min: 20, max: 40, step: 3.2 },
      { min: 40, max: 60, step: 6.4 },
    ],
    presets: [
      { name: "Fit Page", value: ZoomMode.FitPage },
      { name: "Fit Width", value: ZoomMode.FitWidth },
      { name: "Automatic", value: ZoomMode.Automatic },
      { name: "25%", value: 0.25 },
      { name: "50%", value: 0.5 },
      { name: "100%", value: 1 },
      { name: "125%", value: 1.25 },
      { name: "150%", value: 1.5 },
      { name: "200%", value: 2 },
      { name: "400%", value: 4 },
      { name: "800%", value: 8 },
      { name: "1600%", value: 16 },
    ],
  },
}

// ***PLUGIN PACKAGE***
export const ZoomPluginPackage: PluginPackage<ZoomPlugin, ZoomPluginConfig, ZoomState, ZoomAction> =
  {
    manifest,
    create: (registry: PluginRegistry, config: ZoomPluginConfig) =>
      new ZoomPlugin(ZOOM_PLUGIN_ID, registry, config),
    reducer: reducer,
    initialState,
  }

// ***PLUGIN HOOKS***
export const useZoomPlugin = () => usePlugin<ZoomPlugin>(ZOOM_PLUGIN_ID)
export const useZoomCapability = () => useCapability<ZoomPlugin>(ZOOM_PLUGIN_ID)

export function PinchWrapper({ children, style, ...props }: PinchWrapperProps) {
  const { elementRef } = usePinch()
  return /* @__PURE__ */ jsx("div", {
    ref: elementRef,
    ...props,
    style: {
      ...style,
      display: "block",
      width: "fit-content",
      overflow: "visible",
      boxSizing: "border-box",
      margin: "0px auto",
    },
    children,
  })
}

// *****CUSTOM HOOKS*****
export function useZoom(): {
  state: ZoomState
  provides: Readonly<ZoomCapability> | null
} {
  const { provides } = useZoomCapability() as { provides: Readonly<ZoomCapability> | null }
  const [state, setState] = useState(initialState)

  useEffect(() => {
    return provides == null
      ? void 0
      : provides.onStateChange((action: ZoomState) => {
          setState(action)
        })
  }, [provides])

  return {
    state,
    provides,
  }
}

export function usePinch(): {
  elementRef: import("react").RefObject<HTMLDivElement>
} {
  const { provides: viewportProvides } = useCapability("viewport") as {
    provides: ViewportCapability | null
  }
  const { provides: zoomProvides } = useZoomCapability() as {
    provides: Readonly<ZoomCapability> | null
  }
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element || !viewportProvides || !zoomProvides) {
      return
    }
    return setupPinchZoom({ element, viewportProvides, zoomProvides })
  }, [viewportProvides, zoomProvides])

  return { elementRef }
}

function setupPinchZoom({ element, viewportProvides, zoomProvides }: PinchZoomDeps): () => void {
  let hammerInstance: HammerManager | null = null
  if (typeof window === "undefined") {
    return () => {}
  }
  let initialZoom = 0
  let lastCenter = { x: 0, y: 0 }
  const getState = () => zoomProvides.getState()
  const updateTransform = (scale: number) => {
    element.style.transform = `scale(${scale})`
  }
  const resetTransform = () => {
    element.style.transform = "none"
    element.style.transformOrigin = "0 0"
  }
  const pinchStart = (e: HammerInput) => {
    initialZoom = getState().currentZoomLevel
    const contRect = viewportProvides.getBoundingRect()
    lastCenter = {
      x: e.center.x - contRect.origin.x,
      y: e.center.y - contRect.origin.y,
    }
    const innerRect = element.getBoundingClientRect()
    element.style.transformOrigin = `${e.center.x - innerRect.left}px ${e.center.y - innerRect.top}px`
    if (e.srcEvent?.cancelable) {
      e.srcEvent.preventDefault?.()
      e.srcEvent.stopPropagation?.()
    }
  }
  const pinchMove = (e: HammerInput) => {
    updateTransform(e.scale)
    if (e.srcEvent?.cancelable) {
      e.srcEvent.preventDefault?.()
      e.srcEvent.stopPropagation?.()
    }
  }
  const pinchEnd = (e: HammerInput) => {
    const delta = (e.scale - 1) * initialZoom
    zoomProvides.requestZoomBy(delta, { vx: lastCenter.x, vy: lastCenter.y })
    resetTransform()
    initialZoom = 0
  }
  const setupHammer = async () => {
    try {
      const Hammer = window.Hammer
      const inputClass = (() => {
        const MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i
        const SUPPORT_TOUCH = "ontouchstart" in window || navigator.maxTouchPoints > 0
        const SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent)
        if (SUPPORT_ONLY_TOUCH) return Hammer.TouchInput
        if (!SUPPORT_TOUCH) return Hammer.MouseInput
        return Hammer.TouchMouseInput
      })()
      const hammer = new Hammer(element, {
        touchAction: "pan-x pan-y",
        inputClass,
      })
      hammer.get("pinch").set({ enable: true, pointers: 2, threshold: 0.1 })
      hammer.on("pinchstart", pinchStart)
      hammer.on("pinchmove", pinchMove)
      hammer.on("pinchend", pinchEnd)
      hammerInstance = hammer
    } catch (error) {
      console.warn("Failed to load HammerJS:", error)
    }
  }
  setupHammer()
  return () => {
    hammerInstance?.destroy()
    resetTransform()
  }
}
