// .D.TS FILE BELOW
import {
  Action,
  BasePlugin,
  BasePluginConfig,
  EventHook
  type PluginManifest,
  PluginPackage,
  PluginRegistry,
  type Reducer,
  useCapability,
  usePlugin,
} from "../core"
import { Fragment, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { ReactNode, HTMLAttributes, CSSProperties } from 'react';
import { ViewportCapability, ViewportMetrics } from '../plugin-viewport';
import { Action, Rect, Size } from '../core';
import { EmbedPdfPointerEvent, PointerEventHandlersWithLifecycle } from '../plugin-interaction-manager';


export declare enum ZoomMode {
    Automatic = "automatic",
    FitPage = "fit-page",
    FitWidth = "fit-width"
}
export type ZoomLevel = ZoomMode | number;
export interface Point {
    vx: number;
    vy: number;
}
export interface ZoomChangeEvent {
    /** old and new *actual* scale factors */
    oldZoom: number;
    newZoom: number;
    /** level used to obtain the newZoom (number | mode) */
    level: ZoomLevel;
    /** viewport point kept under the finger / mouse‑wheel focus */
    center: Point;
    /** where the viewport should scroll to after the scale change */
    desiredScrollLeft: number;
    desiredScrollTop: number;
    /** metrics at the moment the zoom was requested                    */
    viewport: ViewportMetrics;
}
export interface MarqueeZoomCallback {
    onPreview?: (rect: Rect | null) => void;
    onCommit?: (rect: Rect) => void;
    onSmallDrag?: () => void;
}
export interface RegisterMarqueeOnPageOptions {
    pageIndex: number;
    scale: number;
    callback: MarqueeZoomCallback;
}
export interface ZoomCapability {
    /** subscribe – returns the unsubscribe function */
    onZoomChange: EventHook<ZoomChangeEvent>;
    /** subscribe – returns the unsubscribe function */
    onStateChange: EventHook<ZoomState>;
    /** absolute requests -------------------------------------------------- */
    requestZoom(level: ZoomLevel, center?: Point): void;
    /** relative requests -------------------------------------------------- */
    requestZoomBy(delta: number, center?: Point): void;
    /** absolute requests -------------------------------------------------- */
    zoomIn(): void;
    zoomOut(): void;
    zoomToArea(pageIndex: number, rect: Rect): void;
    /** zoom in on an area -------------------------------------------------- */
    enableMarqueeZoom(): void;
    disableMarqueeZoom(): void;
    toggleMarqueeZoom(): void;
    isMarqueeZoomActive(): boolean;
    /** register a marquee handler on a page -------------------------------- */
    registerMarqueeOnPage: (opts: RegisterMarqueeOnPageOptions) => () => void;
    getState(): ZoomState;
    getPresets(): ZoomPreset[];
}
export interface ZoomRangeStep {
    min: number;
    max: number;
    step: number;
}
export interface ZoomPreset {
    name: string;
    value: ZoomLevel;
    icon?: string;
}
export interface ZoomPluginConfig extends BasePluginConfig {
    defaultZoomLevel: ZoomLevel;
    minZoom?: number;
    maxZoom?: number;
    zoomStep?: number;
    zoomRanges?: ZoomRangeStep[];
    presets?: ZoomPreset[];
}
export interface ZoomState {
    zoomLevel: ZoomLevel;
    currentZoomLevel: number;
}
export declare enum VerticalZoomFocus {
    Center = 0,
    Top = 1
}
export interface ZoomRequest {
    level: ZoomLevel;
    delta?: number;
    center?: Point;
    focus?: VerticalZoomFocus;
    /** Scroll so that the focal point ends up …
     *  ▸ `"keep"`   (default) at the same viewport coords
     *  ▸ `"center"` centred in the viewport  */
    align?: 'keep' | 'center';
}

export declare function createMarqueeHandler(opts: {
    pageSize: Size;
    scale: number;
    minDragPx?: number;
    onPreview?: (rect: Rect | null) => void;
    onCommit?: (rect: Rect) => void;
    onSmallDrag?: () => void;
}): PointerEventHandlersWithLifecycle<EmbedPdfPointerEvent>;

export declare const SET_ZOOM_LEVEL = "SET_ZOOM_LEVEL";
export declare const SET_INITIAL_ZOOM_LEVEL = "SET_INITIAL_ZOOM_LEVEL";
export interface SetZoomLevelAction extends Action {
    type: typeof SET_ZOOM_LEVEL;
    payload: {
        zoomLevel: ZoomLevel;
        currentZoomLevel: number;
    };
}
export interface SetInitialZoomLevelAction extends Action {
    type: typeof SET_INITIAL_ZOOM_LEVEL;
    payload: {
        zoomLevel: ZoomLevel;
    };
}
export type ZoomAction = SetZoomLevelAction | SetInitialZoomLevelAction;
export declare function setZoomLevel(zoomLevel: ZoomLevel, currentZoomLevel: number): SetZoomLevelAction;
export declare function setInitialZoomLevel(zoomLevel: ZoomLevel): SetInitialZoomLevelAction;

export declare const ZOOM_PLUGIN_ID = "zoom";
export declare const manifest: PluginManifest<ZoomPluginConfig>;

export declare class ZoomPlugin extends BasePlugin<ZoomPluginConfig, ZoomCapability, ZoomState, ZoomAction> {
    static readonly id: "zoom";
    private readonly zoom$;
    private readonly state$;
    private readonly viewport;
    private readonly viewportPlugin;
    private readonly scroll;
    private readonly interactionManager;
    private readonly presets;
    private readonly zoomRanges;
    private readonly minZoom;
    private readonly maxZoom;
    private readonly zoomStep;
    constructor(id: string, registry: PluginRegistry, cfg: ZoomPluginConfig);
    protected buildCapability(): ZoomCapability;
    private zoomOut;
    private zoomIn;
    private zoomToArea;
    initialize(): Promise<void>;
    destroy(): Promise<void>;
    /**
     * Sort ranges once, make sure they are sane
     */
    private normalizeRanges;
    /** pick the step that applies to a given numeric zoom */
    private stepFor;
    /** clamp + round helper reused later */
    private toZoom;
    private handleRequest;
    /** numeric zoom for Automatic / FitPage / FitWidth */
    private computeZoomForMode;
    /** where to scroll so that *focus* stays stable after scaling          */
    private computeScrollForZoomChange;
    private handleZoomToArea;
    /** recalculates Automatic / Fit* when viewport or pages change */
    private recalcAuto;
    onStoreUpdated(_prevState: ZoomState, newState: ZoomState): void;
    registerMarqueeOnPage(opts: RegisterMarqueeOnPageOptions): () => void;
}


export declare const ZoomPluginPackage: PluginPackage<ZoomPlugin, ZoomPluginConfig, ZoomState, ZoomAction>;

interface MarqueeZoomProps {
  /** Index of the page this layer lives on */
  pageIndex: number;
  /** Scale of the page */
  scale: number;
  /** Optional CSS class applied to the marquee rectangle */
  className?: string;
  /** Stroke / fill colours (defaults below) */
  stroke?: string;
  fill?: string;
}
export declare const MarqueeZoom: ({ pageIndex, scale, className, stroke, fill, }: MarqueeZoomProps) => import("react/jsx-runtime").JSX.Element | null;

type PinchWrapperProps = Omit<HTMLAttributes<HTMLDivElement>, 'style'> & {
    children: ReactNode;
    style?: CSSProperties;
};
export declare function PinchWrapper({ children, style, ...props }: PinchWrapperProps): import("react/jsx-runtime").JSX.Element;

export declare function usePinch(): {
    elementRef: import('react').RefObject<HTMLDivElement>;
};

export declare const useZoom: () => {
    state: ZoomState;
    provides: Readonly<ZoomCapability> | null;
};

export interface PinchZoomDeps {
    element: HTMLDivElement;
    viewportProvides: ViewportCapability;
    zoomProvides: ZoomCapability;
}
export declare function setupPinchZoom({ element, viewportProvides, zoomProvides }: PinchZoomDeps): () => void;

// .JS FILE BELOW

import {
  clamp,
  BasePlugin,
  createEmitter,
  createBehaviorEmitter,
  SET_ROTATION,
  SET_PAGES,
  SET_DOCUMENT,
  setScale,
  getPagesWithRotatedSize,
  rotateRect,
  useCapability,
  usePlugin,
} from "../core"
import { useState, useEffect, useRef } from "react"
import { jsx } from "react/jsx-runtime"

var ZoomMode = /* @__PURE__ */ ((ZoomMode2) => {
  ZoomMode2["Automatic"] = "automatic"
  ZoomMode2["FitPage"] = "fit-page"
  ZoomMode2["FitWidth"] = "fit-width"
  return ZoomMode2
})(ZoomMode || {})
var VerticalZoomFocus = /* @__PURE__ */ ((VerticalZoomFocus2) => {
  VerticalZoomFocus2[(VerticalZoomFocus2["Center"] = 0)] = "Center"
  VerticalZoomFocus2[(VerticalZoomFocus2["Top"] = 1)] = "Top"
  return VerticalZoomFocus2
})(VerticalZoomFocus || {})
const ZOOM_PLUGIN_ID = "zoom"
const manifest = {
  id: ZOOM_PLUGIN_ID,
  name: "Zoom Plugin",
  version: "1.0.0",
  provides: ["zoom"],
  requires: ["viewport", "scroll"],
  optional: ["interaction-manager"],
  defaultConfig: {
    enabled: true,
    defaultZoomLevel: ZoomMode.Automatic,
    minZoom: 0.2,
    maxZoom: 60,
    zoomStep: 0.1,
    zoomRanges: [
      {
        min: 0.2,
        max: 0.5,
        step: 0.05,
      },
      {
        min: 0.5,
        max: 1,
        step: 0.1,
      },
      {
        min: 1,
        max: 2,
        step: 0.2,
      },
      {
        min: 2,
        max: 4,
        step: 0.4,
      },
      {
        min: 4,
        max: 10,
        step: 0.8,
      },
      {
        min: 10,
        max: 20,
        step: 1.6,
      },
      {
        min: 20,
        max: 40,
        step: 3.2,
      },
      {
        min: 40,
        max: 60,
        step: 6.4,
      },
    ],
    presets: [
      {
        name: "Fit Page",
        value: ZoomMode.FitPage,
      },
      {
        name: "Fit Width",
        value: ZoomMode.FitWidth,
      },
      {
        name: "Automatic",
        value: ZoomMode.Automatic,
      },
      {
        name: "25%",
        value: 0.25,
      },
      {
        name: "50%",
        value: 0.5,
      },
      {
        name: "100%",
        value: 1,
      },
      {
        name: "125%",
        value: 1.25,
      },
      {
        name: "150%",
        value: 1.5,
      },
      {
        name: "200%",
        value: 2,
      },
      {
        name: "400%",
        value: 4,
      },
      {
        name: "800%",
        value: 8,
      },
      {
        name: "1600%",
        value: 16,
      },
    ],
  },
}
const SET_ZOOM_LEVEL = "SET_ZOOM_LEVEL"
const SET_INITIAL_ZOOM_LEVEL = "SET_INITIAL_ZOOM_LEVEL"
function setZoomLevel(zoomLevel, currentZoomLevel) {
  return {
    type: SET_ZOOM_LEVEL,
    payload: { zoomLevel, currentZoomLevel },
  }
}
function setInitialZoomLevel(zoomLevel) {
  return {
    type: SET_INITIAL_ZOOM_LEVEL,
    payload: { zoomLevel },
  }
}
const initialState = {
  zoomLevel: ZoomMode.Automatic,
  currentZoomLevel: 1,
}
const zoomReducer = (state = initialState, action) => {
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
function createMarqueeHandler(opts) {
  const { pageSize, scale, minDragPx = 5, onPreview, onCommit, onSmallDrag } = opts
  let start = null
  let last = null
  return {
    onPointerDown: (pos, evt) => {
      var _a
      start = pos
      last = { origin: { x: pos.x, y: pos.y }, size: { width: 0, height: 0 } }
      onPreview == null ? void 0 : onPreview(last)
      ;(_a = evt.setPointerCapture) == null ? void 0 : _a.call(evt)
    },
    onPointerMove: (pos) => {
      if (!start) return
      const x = clamp(pos.x, 0, pageSize.width)
      const y = clamp(pos.y, 0, pageSize.height)
      last = {
        origin: { x: Math.min(start.x, x), y: Math.min(start.y, y) },
        size: { width: Math.abs(x - start.x), height: Math.abs(y - start.y) },
      }
      onPreview == null ? void 0 : onPreview(last)
    },
    onPointerUp: (_pos, evt) => {
      var _a
      if (last) {
        const dragPx = Math.max(last.size.width, last.size.height) * scale
        if (dragPx > minDragPx) {
          onCommit == null ? void 0 : onCommit(last)
        } else {
          onSmallDrag == null ? void 0 : onSmallDrag()
        }
      }
      start = null
      last = null
      onPreview == null ? void 0 : onPreview(null)
      ;(_a = evt.releasePointerCapture) == null ? void 0 : _a.call(evt)
    },
    onPointerCancel: (_pos, evt) => {
      var _a
      start = null
      last = null
      onPreview == null ? void 0 : onPreview(null)
      ;(_a = evt.releasePointerCapture) == null ? void 0 : _a.call(evt)
    },
  }
}
const _ZoomPlugin = class _ZoomPlugin extends BasePlugin {
  /* ------------------------------------------------------------------ */
  constructor(id, registry, cfg) {
    var _a
    super(id, registry)
    this.zoom$ = createEmitter()
    this.state$ = createBehaviorEmitter()
    this.viewportPlugin = registry.getPlugin("viewport")
    this.viewport = this.viewportPlugin.provides()
    this.scroll = registry.getPlugin("scroll").provides()
    const interactionManager = registry.getPlugin("interaction-manager")
    this.interactionManager =
      (interactionManager == null ? void 0 : interactionManager.provides()) ?? null
    this.minZoom = cfg.minZoom ?? 0.25
    this.maxZoom = cfg.maxZoom ?? 10
    this.zoomStep = cfg.zoomStep ?? 0.1
    this.presets = cfg.presets ?? []
    this.zoomRanges = this.normalizeRanges(cfg.zoomRanges ?? [])
    this.dispatch(setInitialZoomLevel(cfg.defaultZoomLevel))
    this.viewport.onViewportResize(() => this.recalcAuto(VerticalZoomFocus.Top), {
      mode: "debounce",
      wait: 150,
    })
    this.coreStore.onAction(SET_ROTATION, () => this.recalcAuto(VerticalZoomFocus.Top))
    this.coreStore.onAction(SET_PAGES, () => this.recalcAuto(VerticalZoomFocus.Top))
    this.coreStore.onAction(SET_DOCUMENT, () => this.recalcAuto(VerticalZoomFocus.Top))
    ;(_a = this.interactionManager) == null
      ? void 0
      : _a.registerMode({
          id: "marqueeZoom",
          scope: "page",
          exclusive: true,
          cursor: "zoom-in",
        })
    this.resetReady()
  }
  /* ------------------------------------------------------------------ */
  /* capability                                                          */
  /* ------------------------------------------------------------------ */
  buildCapability() {
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
      enableMarqueeZoom: () => {
        var _a
        ;(_a = this.interactionManager) == null ? void 0 : _a.activate("marqueeZoom")
      },
      disableMarqueeZoom: () => {
        var _a
        ;(_a = this.interactionManager) == null ? void 0 : _a.activateDefaultMode()
      },
      toggleMarqueeZoom: () => {
        var _a, _b, _c
        if (
          ((_a = this.interactionManager) == null ? void 0 : _a.getActiveMode()) === "marqueeZoom"
        ) {
          ;(_b = this.interactionManager) == null ? void 0 : _b.activateDefaultMode()
        } else {
          ;(_c = this.interactionManager) == null ? void 0 : _c.activate("marqueeZoom")
        }
      },
      isMarqueeZoomActive: () => {
        var _a
        return (
          ((_a = this.interactionManager) == null ? void 0 : _a.getActiveMode()) === "marqueeZoom"
        )
      },
      registerMarqueeOnPage: (opts) => this.registerMarqueeOnPage(opts),
      getState: () => this.state,
      getPresets: () => this.presets,
    }
  }
  zoomOut() {
    const cur = this.state.currentZoomLevel
    return this.handleRequest({ level: cur, delta: -this.stepFor(cur) })
  }
  zoomIn() {
    const cur = this.state.currentZoomLevel
    return this.handleRequest({ level: cur, delta: this.stepFor(cur) })
  }
  zoomToArea(pageIndex, rect) {
    this.handleZoomToArea(pageIndex, rect)
  }
  /* ------------------------------------------------------------------ */
  /* plugin life‑cycle                                                   */
  /* ------------------------------------------------------------------ */
  async initialize() {}
  async destroy() {
    this.zoom$.clear()
  }
  /**
   * Sort ranges once, make sure they are sane
   */
  normalizeRanges(ranges) {
    return [...ranges].filter((r) => r.step > 0 && r.max > r.min).sort((a, b) => a.min - b.min)
  }
  /** pick the step that applies to a given numeric zoom */
  stepFor(zoom) {
    const r = this.zoomRanges.find((r2) => zoom >= r2.min && zoom < r2.max)
    return r ? r.step : this.zoomStep
  }
  /** clamp + round helper reused later */
  toZoom(v) {
    return parseFloat(clamp(v, this.minZoom, this.maxZoom).toFixed(2))
  }
  /* ------------------------------------------------------------------ */
  /* main entry – handles **every** zoom request                          */
  /* ------------------------------------------------------------------ */
  handleRequest({ level, delta = 0, center, focus = VerticalZoomFocus.Center, align = "keep" }) {
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
      this.viewportPlugin.setViewportScrollMetrics({
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
    const evt = {
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
  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */
  /** numeric zoom for Automatic / FitPage / FitWidth */
  computeZoomForMode(mode, vp) {
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
      /* istanbul ignore next */
      default:
        return 1
    }
  }
  /** where to scroll so that *focus* stays stable after scaling          */
  computeScrollForZoomChange(vp, oldZoom, newZoom, focus, align = "keep") {
    const layout = this.scroll.getLayout()
    const vpGap = this.viewport.getViewportGap()
    const contentW = layout.totalContentSize.width
    const contentH = layout.totalContentSize.height
    const availableWidth = vp.clientWidth - 2 * vpGap
    const availableHeight = vp.clientHeight - 2 * vpGap
    const off = (availableSpace, cw, zoom) =>
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
  handleZoomToArea(pageIndex, rect) {
    const rotation = this.coreState.core.rotation
    const vp = this.viewport.getMetrics()
    const vpGap = this.viewport.getViewportGap()
    const oldZ = this.state.currentZoomLevel
    const availableW = vp.clientWidth - 2 * vpGap
    const availableH = vp.clientHeight - 2 * vpGap
    const layout = this.scroll.getLayout()
    const vItem = layout.virtualItems.find((it) =>
      it.pageLayouts.some((p) => p.pageIndex === pageIndex),
    )
    if (!vItem) return
    const pageRel = vItem.pageLayouts.find((p) => p.pageIndex === pageIndex)
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
    const off = (avail, cw, z) => (cw * z < avail ? (avail - cw * z) / 2 : 0)
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
  recalcAuto(focus) {
    const s = this.state
    if (
      s.zoomLevel === ZoomMode.Automatic ||
      s.zoomLevel === ZoomMode.FitPage ||
      s.zoomLevel === ZoomMode.FitWidth
    )
      this.handleRequest({ level: s.zoomLevel, focus })
  }
  onStoreUpdated(_prevState, newState) {
    this.state$.emit(newState)
  }
  registerMarqueeOnPage(opts) {
    if (!this.interactionManager) {
      this.logger.warn(
        "ZoomPlugin",
        "MissingDependency",
        "Interaction manager plugin not loaded, marquee zoom disabled",
      )
      return () => {}
    }
    const document = this.coreState.core.document
    if (!document) {
      this.logger.warn("ZoomPlugin", "DocumentNotFound", "Document not found")
      return () => {}
    }
    const page = document.pages[opts.pageIndex]
    if (!page) {
      this.logger.warn("ZoomPlugin", "PageNotFound", `Page ${opts.pageIndex} not found`)
      return () => {}
    }
    const handlers = createMarqueeHandler({
      pageSize: page.size,
      scale: opts.scale,
      onPreview: opts.callback.onPreview,
      onCommit: (rect) => {
        var _a, _b
        this.zoomToArea(opts.pageIndex, rect)
        ;(_b = (_a = opts.callback).onCommit) == null ? void 0 : _b.call(_a, rect)
      },
      onSmallDrag: () => {
        var _a, _b
        this.zoomIn()
        ;(_b = (_a = opts.callback).onSmallDrag) == null ? void 0 : _b.call(_a)
      },
    })
    const off = this.interactionManager.registerHandlers({
      modeId: "marqueeZoom",
      handlers,
      pageIndex: opts.pageIndex,
    })
    return off
  }
}
_ZoomPlugin.id = "zoom"
let ZoomPlugin = _ZoomPlugin
const ZoomPluginPackage = {
  manifest,
  create: (registry, config) => new ZoomPlugin(ZOOM_PLUGIN_ID, registry, config),
  reducer: zoomReducer,
  initialState,
}

const useZoomCapability = () => useCapability(ZoomPlugin.id)
const useZoomPlugin = () => usePlugin(ZoomPlugin.id)
const useZoom = () => {
  const { provides } = useZoomCapability()
  const [state, setState] = useState(initialState)
  useEffect(() => {
    return provides == null
      ? void 0
      : provides.onStateChange((action) => {
          setState(action)
        })
  }, [provides])
  return {
    state,
    provides,
  }
}

import "./hammer.js"
function setupPinchZoom({ element, viewportProvides, zoomProvides }) {
  let hammerInstance = null
  if (typeof window === "undefined") {
    return () => {}
  }
  let initialZoom = 0
  let lastCenter = { x: 0, y: 0 }
  const getState = () => zoomProvides.getState()
  const updateTransform = (scale) => {
    element.style.transform = `scale(${scale})`
  }
  const resetTransform = () => {
    element.style.transform = "none"
    element.style.transformOrigin = "0 0"
  }
  const pinchStart = (e) => {
    var _a
    initialZoom = getState().currentZoomLevel
    const contRect = viewportProvides.getBoundingRect()
    lastCenter = {
      x: e.center.x - contRect.origin.x,
      y: e.center.y - contRect.origin.y,
    }
    const innerRect = element.getBoundingClientRect()
    element.style.transformOrigin = `${e.center.x - innerRect.left}px ${e.center.y - innerRect.top}px`
    if ((_a = e.srcEvent) == null ? void 0 : _a.cancelable) {
      e.srcEvent.preventDefault()
      e.srcEvent.stopPropagation()
    }
  }
  const pinchMove = (e) => {
    var _a
    updateTransform(e.scale)
    if ((_a = e.srcEvent) == null ? void 0 : _a.cancelable) {
      e.srcEvent.preventDefault()
      e.srcEvent.stopPropagation()
    }
  }
  const pinchEnd = (e) => {
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
      hammer = new Hammer(element, {
        touchAction: "pan-x pan-y",
        inputClass,
      })
      hammer.get("pinch").set({ enable: true, pointers: 2, threshold: 0.1 })
      hammer.on("pinchstart", pinchStart)
      hammer.on("pinchmove", pinchMove)
      hammer.on("pinchend", pinchEnd)
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

function usePinch() {
  const { provides: viewportProvides } = useCapability("viewport")
  const { provides: zoomProvides } = useZoomCapability()
  const elementRef = useRef(null)
  useEffect(() => {
    const element = elementRef.current
    if (!element || !viewportProvides || !zoomProvides) {
      return
    }
    return setupPinchZoom({ element, viewportProvides, zoomProvides })
  }, [viewportProvides, zoomProvides])
  return { elementRef }
}
function PinchWrapper({ children, style, ...props }) {
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
const MarqueeZoom = ({
  pageIndex,
  scale,
  className,
  stroke = "rgba(33,150,243,0.8)",
  fill = "rgba(33,150,243,0.15)",
}) => {
  const { provides: zoomPlugin } = useZoomCapability()
  const [rect, setRect] = useState(null)
  useEffect(() => {
    if (!zoomPlugin) return
    return zoomPlugin.registerMarqueeOnPage({
      pageIndex,
      scale,
      callback: {
        onPreview: setRect,
      },
    })
  }, [zoomPlugin, pageIndex, scale])
  if (!rect) return null
  return /* @__PURE__ */ jsx("div", {
    style: {
      position: "absolute",
      pointerEvents: "none",
      left: rect.origin.x * scale,
      top: rect.origin.y * scale,
      width: rect.size.width * scale,
      height: rect.size.height * scale,
      border: `1px solid ${stroke}`,
      background: fill,
      boxSizing: "border-box",
    },
    className,
  })
}
