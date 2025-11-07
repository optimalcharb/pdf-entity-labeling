import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { jsx } from "react/jsx-runtime"
import {
  Action,
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  createEmitter,
  PluginManifest,
  PluginPackage,
  PluginRegistry,
  type Reducer,
  useCapability,
  usePlugin,
} from "../core"

// *****CUSTOM TYPES******
export interface ViewportScrollMetrics {
  scrollTop: number
  scrollLeft: number
}

export interface ScrollControlOptions {
  mode: "debounce" | "throttle"
  wait: number
}

export interface ScrollToPayload {
  x: number
  y: number
  behavior?: ScrollBehavior
  center?: boolean
}

export interface ScrollActivity {
  isSmoothScrolling: boolean
  isScrolling: boolean
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const VIEWPORT_PLUGIN_ID = "viewport"

// ***STATE***
export interface ViewportInputMetrics {
  width: number
  height: number
  scrollTop: number
  scrollLeft: number
  clientWidth: number
  clientHeight: number
  scrollWidth: number
  scrollHeight: number
}

export interface ViewportMetrics extends ViewportInputMetrics {
  relativePosition: {
    x: number
    y: number
  }
}

export interface ViewportState {
  viewportGap: number
  viewportMetrics: ViewportMetrics
  isScrolling: boolean
  isSmoothScrolling: boolean
}

// ***INITIAL STATE***
const initialState: ViewportState = {
  viewportGap: 0,
  viewportMetrics: {
    width: 0,
    height: 0,
    scrollTop: 0,
    scrollLeft: 0,
    clientWidth: 0,
    clientHeight: 0,
    scrollWidth: 0,
    scrollHeight: 0,
    relativePosition: {
      x: 0,
      y: 0,
    },
  },
  isScrolling: false,
  isSmoothScrolling: false,
}

// ***ACTION CONSTANTS***
const SET_VIEWPORT_METRICS = "SET_VIEWPORT_METRICS"
const SET_VIEWPORT_SCROLL_METRICS = "SET_VIEWPORT_SCROLL_METRICS"
const SET_VIEWPORT_GAP = "SET_VIEWPORT_GAP"
const SET_SCROLL_ACTIVITY = "SET_SCROLL_ACTIVITY"
const SET_SMOOTH_SCROLL_ACTIVITY = "SET_SMOOTH_SCROLL_ACTIVITY"

// ***ACTION INTERFACES***
interface SetViewportMetricsAction extends Action {
  type: typeof SET_VIEWPORT_METRICS
  payload: ViewportInputMetrics
}

interface SetViewportScrollMetricsAction extends Action {
  type: typeof SET_VIEWPORT_SCROLL_METRICS
  payload: ViewportScrollMetrics
}

interface SetViewportGapAction extends Action {
  type: typeof SET_VIEWPORT_GAP
  payload: number
}

interface SetScrollActivityAction extends Action {
  type: typeof SET_SCROLL_ACTIVITY
  payload: boolean
}

interface SetSmoothScrollActivityAction extends Action {
  type: typeof SET_SMOOTH_SCROLL_ACTIVITY
  payload: boolean
}

// ***ACTION UNION***
export type ViewportAction =
  | SetViewportMetricsAction
  | SetViewportScrollMetricsAction
  | SetViewportGapAction
  | SetScrollActivityAction
  | SetSmoothScrollActivityAction

// ***ACTION CREATORS***
const setViewportGap = (viewportGap: number): SetViewportGapAction => ({
  type: SET_VIEWPORT_GAP,
  payload: viewportGap,
})

const setViewportMetrics = (viewportMetrics: ViewportInputMetrics): SetViewportMetricsAction => ({
  type: SET_VIEWPORT_METRICS,
  payload: viewportMetrics,
})

const setViewportScrollMetrics = (
  scrollMetrics: ViewportScrollMetrics,
): SetViewportScrollMetricsAction => ({
  type: SET_VIEWPORT_SCROLL_METRICS,
  payload: scrollMetrics,
})

const setScrollActivity = (isScrolling: boolean): SetScrollActivityAction => ({
  type: SET_SCROLL_ACTIVITY,
  payload: isScrolling,
})

const setSmoothScrollActivity = (isSmoothScrolling: boolean): SetSmoothScrollActivityAction => ({
  type: SET_SMOOTH_SCROLL_ACTIVITY,
  payload: isSmoothScrolling,
})

// ***ACTION REDUCER***
const viewportReducer: Reducer<ViewportState, ViewportAction> = (
  state: ViewportState = initialState,
  action: ViewportAction,
): ViewportState => {
  switch (action.type) {
    case SET_VIEWPORT_GAP:
      return { ...state, viewportGap: action.payload }
    case SET_VIEWPORT_METRICS:
      return {
        ...state,
        viewportMetrics: {
          width: action.payload.width,
          height: action.payload.height,
          scrollTop: action.payload.scrollTop,
          scrollLeft: action.payload.scrollLeft,
          clientWidth: action.payload.clientWidth,
          clientHeight: action.payload.clientHeight,
          scrollWidth: action.payload.scrollWidth,
          scrollHeight: action.payload.scrollHeight,
          relativePosition: {
            x:
              action.payload.scrollWidth <= action.payload.clientWidth
                ? 0
                : action.payload.scrollLeft /
                  (action.payload.scrollWidth - action.payload.clientWidth),
            y:
              action.payload.scrollHeight <= action.payload.clientHeight
                ? 0
                : action.payload.scrollTop /
                  (action.payload.scrollHeight - action.payload.clientHeight),
          },
        },
      }
    case SET_VIEWPORT_SCROLL_METRICS:
      return {
        ...state,
        viewportMetrics: {
          ...state.viewportMetrics,
          scrollTop: action.payload.scrollTop,
          scrollLeft: action.payload.scrollLeft,
        },
        isScrolling: true,
      }
    case SET_SCROLL_ACTIVITY:
      return { ...state, isScrolling: action.payload }
    case SET_SMOOTH_SCROLL_ACTIVITY:
      return { ...state, isSmoothScrolling: action.payload }
    default:
      return state
  }
}

// ***PLUGIN CAPABILITY***
export interface ViewportCapability {
  getViewportGap: () => number
  getMetrics: () => ViewportMetrics
  scrollTo(position: ScrollToPayload): void
  onViewportChange: (handler: (metrics: ViewportMetrics) => void) => () => void
  onViewportResize: (handler: (metrics: ViewportMetrics) => void) => () => void
  onScrollChange: (handler: (metrics: ViewportScrollMetrics) => void) => () => void
  onScrollActivity: (handler: (activity: ScrollActivity) => void) => () => void
  isScrolling: () => boolean
  isSmoothScrolling: () => boolean
  getBoundingRect(): any
}

// ***PLUGIN CONFIG***
export interface ViewportPluginConfig extends BasePluginConfig {
  viewportGap?: number
  scrollEndDelay?: number
}

// ***PLUGIN CLASS***
export class ViewportPlugin extends BasePlugin<
  ViewportPluginConfig,
  ViewportCapability,
  ViewportState,
  ViewportAction
> {
  static readonly id: string = VIEWPORT_PLUGIN_ID

  private readonly viewportResize$ = createBehaviorEmitter()
  private readonly viewportMetrics$ = createBehaviorEmitter()
  private readonly scrollMetrics$ = createBehaviorEmitter()
  private readonly scrollReq$ = createEmitter()
  private readonly scrollActivity$ = createBehaviorEmitter()
  private rectProvider: any = null
  private readonly scrollEndDelay: number

  constructor(id: string, registry: PluginRegistry, config: ViewportPluginConfig) {
    super(id, registry)
    if (config.viewportGap) {
      this.dispatch(setViewportGap(config.viewportGap))
    }
    this.scrollEndDelay = config.scrollEndDelay || 100
  }

  buildCapability(): ViewportCapability {
    return {
      getViewportGap: () => this.state.viewportGap,
      getMetrics: () => this.state.viewportMetrics,
      getBoundingRect: () => {
        return (
          this.rectProvider?.() ?? {
            origin: { x: 0, y: 0 },
            size: { width: 0, height: 0 },
          }
        )
      },
      scrollTo: (pos: ScrollToPayload) => this.scrollTo(pos),
      isScrolling: () => this.state.isScrolling,
      isSmoothScrolling: () => this.state.isSmoothScrolling,
      onScrollChange: this.scrollMetrics$.on,
      onViewportChange: this.viewportMetrics$.on,
      onViewportResize: this.viewportResize$.on,
      onScrollActivity: this.scrollActivity$.on,
    }
  }

  setViewportResizeMetrics(viewportMetrics: ViewportInputMetrics) {
    this.dispatch(setViewportMetrics(viewportMetrics))
    this.viewportResize$.emit(this.state.viewportMetrics)
  }

  setViewportScrollMetrics(scrollMetrics: ViewportScrollMetrics) {
    if (
      scrollMetrics.scrollTop !== this.state.viewportMetrics.scrollTop ||
      scrollMetrics.scrollLeft !== this.state.viewportMetrics.scrollLeft
    ) {
      this.dispatch(setViewportScrollMetrics(scrollMetrics))
      this.bumpScrollActivity()
      this.scrollMetrics$.emit({
        scrollTop: scrollMetrics.scrollTop,
        scrollLeft: scrollMetrics.scrollLeft,
      })
    }
  }

  onScrollRequest(listener: (payload: ScrollToPayload) => void) {
    return this.scrollReq$.on(listener)
  }

  registerBoundingRectProvider(provider: any) {
    this.rectProvider = provider
  }

  private bumpScrollActivity() {
    this.debouncedDispatch(setScrollActivity(false), this.scrollEndDelay)
    this.debouncedDispatch(setSmoothScrollActivity(false), this.scrollEndDelay)
  }

  private scrollTo(pos: ScrollToPayload) {
    const { x, y, center, behavior = "auto" } = pos
    if (behavior === "smooth") {
      this.dispatch(setSmoothScrollActivity(true))
    }
    if (center) {
      const metrics = this.state.viewportMetrics
      const centeredX = x - metrics.clientWidth / 2
      const centeredY = y - metrics.clientHeight / 2
      this.scrollReq$.emit({
        x: centeredX,
        y: centeredY,
        behavior,
      })
    } else {
      this.scrollReq$.emit({
        x,
        y,
        behavior,
      })
    }
  }

  private emitScrollActivity() {
    const scrollActivity: ScrollActivity = {
      isSmoothScrolling: this.state.isSmoothScrolling,
      isScrolling: this.state.isScrolling,
    }
    this.scrollActivity$.emit(scrollActivity)
  }

  // Subscribe to store changes to notify onViewportChange
  onStoreUpdated(prevState: ViewportState, newState: ViewportState) {
    if (prevState !== newState) {
      this.viewportMetrics$.emit(newState.viewportMetrics)
      if (
        prevState.isScrolling !== newState.isScrolling ||
        prevState.isSmoothScrolling !== newState.isSmoothScrolling
      ) {
        this.emitScrollActivity()
      }
    }
  }

  async initialize(_config: ViewportPluginConfig) {}

  async destroy() {
    super.destroy()
    this.viewportMetrics$.clear()
    this.viewportResize$.clear()
    this.scrollMetrics$.clear()
    this.scrollReq$.clear()
    this.scrollActivity$.clear()
    this.rectProvider = null
  }
}

// ***MANIFEST***
const manifest: PluginManifest<ViewportPluginConfig> = {
  id: VIEWPORT_PLUGIN_ID,
  name: "Viewport Plugin",
  version: "1.0.0",
  provides: [VIEWPORT_PLUGIN_ID],
  requires: [],
  optional: [],
  defaultConfig: {
    enabled: true,
    viewportGap: 10,
    scrollEndDelay: 300,
  },
}

// ***PLUGIN PACKAGE***
export const ViewportPluginPackage: PluginPackage<
  ViewportPlugin,
  ViewportPluginConfig,
  ViewportState,
  ViewportAction
> = {
  manifest,
  create: (registry: PluginRegistry, config: ViewportPluginConfig) =>
    new ViewportPlugin(VIEWPORT_PLUGIN_ID, registry, config),
  reducer: viewportReducer,
  initialState,
}

// ***PLUGIN HOOKS***
export const useViewportPlugin = () => usePlugin<ViewportPlugin>(VIEWPORT_PLUGIN_ID)
export const useViewportCapability = () => useCapability<ViewportPlugin>(VIEWPORT_PLUGIN_ID)

// *****COMPONENTS******
interface ViewportProps {
  children: any
  [key: string]: any
}

export function Viewport({ children, ...props }: ViewportProps) {
  const [viewportGap, setViewportGap] = useState(0)
  const viewportRef = useViewportRef()
  const { provides: viewportProvides } = useViewportCapability()

  useEffect(() => {
    if (viewportProvides) {
      setViewportGap((viewportProvides as any).getViewportGap())
    }
  }, [viewportProvides])

  const { style, ...restProps } = props
  return /* @__PURE__ */ jsx("div", {
    ...restProps,
    ref: viewportRef,
    style: {
      width: "100%",
      height: "100%",
      overflow: "auto",
      ...(typeof style === "object" ? style : {}),
      padding: `${viewportGap}px`,
    },
    children,
  })
}

// *****CUSTOM HOOKS*****
export const useViewportScrollActivity = () => {
  const { provides } = useViewportCapability()
  const [scrollActivity, setScrollActivity] = useState<ScrollActivity>({
    isScrolling: false,
    isSmoothScrolling: false,
  })

  useEffect(() => {
    if (!provides) return
    return (provides as any).onScrollActivity(setScrollActivity)
  }, [provides])

  return scrollActivity
}

export const useViewportRef = () => {
  const { plugin: viewportPlugin } = useViewportPlugin()
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!viewportPlugin) return
    const container = containerRef.current
    if (!container) return

    const provideRect = () => {
      const r = container.getBoundingClientRect()
      return {
        origin: { x: r.left, y: r.top },
        size: { width: r.width, height: r.height },
      }
    }

    ;(viewportPlugin as any).registerBoundingRectProvider(provideRect)

    const onScroll = () => {
      ;(viewportPlugin as any).setViewportScrollMetrics({
        scrollTop: container.scrollTop,
        scrollLeft: container.scrollLeft,
      })
    }

    container.addEventListener("scroll", onScroll)

    const resizeObserver = new ResizeObserver(() => {
      ;(viewportPlugin as any).setViewportResizeMetrics({
        width: container.offsetWidth,
        height: container.offsetHeight,
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight,
        scrollTop: container.scrollTop,
        scrollLeft: container.scrollLeft,
        scrollWidth: container.scrollWidth,
        scrollHeight: container.scrollHeight,
      })
    })

    resizeObserver.observe(container)

    const unsubscribeScrollRequest = (viewportPlugin as any).onScrollRequest(
      ({ x, y, behavior = "auto" }: ScrollToPayload) => {
        requestAnimationFrame(() => {
          container.scrollTo({ left: x, top: y, behavior })
        })
      },
    )

    return () => {
      ;(viewportPlugin as any).registerBoundingRectProvider(null)
      container.removeEventListener("scroll", onScroll)
      resizeObserver.disconnect()
      unsubscribeScrollRequest()
    }
  }, [viewportPlugin])

  return containerRef
}
