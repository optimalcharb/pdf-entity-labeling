import {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import React, { jsx, jsxs } from "react/jsx-runtime"
import {
  Action,
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  createEmitter,
  EventHook,
  PluginManifest,
  PluginPackage,
  PluginRegistry,
  Position,
  Reducer,
  restorePosition,
  transformSize,
  useCapability,
  usePlugin,
} from "../core"

// *****CUSTOM TYPES******
// ***EVENTS***
export interface PdfPointerEvent {
  clientX: number
  clientY: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  target: EventTarget | null
  currentTarget: EventTarget | null
  setPointerCapture?(): void
  releasePointerCapture?(): void
}
export interface PointerEventHandlers<T = PdfPointerEvent> {
  onPointerDown?(pos: Position, evt: T, modeId: string): void
  onPointerUp?(pos: Position, evt: T, modeId: string): void
  onPointerMove?(pos: Position, evt: T, modeId: string): void
  onPointerEnter?(pos: Position, evt: T, modeId: string): void
  onPointerLeave?(pos: Position, evt: T, modeId: string): void
  onPointerCancel?(pos: Position, evt: T, modeId: string): void
  onMouseDown?(pos: Position, evt: T, modeId: string): void
  onMouseUp?(pos: Position, evt: T, modeId: string): void
  onMouseMove?(pos: Position, evt: T, modeId: string): void
  onMouseEnter?(pos: Position, evt: T, modeId: string): void
  onMouseLeave?(pos: Position, evt: T, modeId: string): void
  onMouseCancel?(pos: Position, evt: T, modeId: string): void
  onClick?(pos: Position, evt: T, modeId: string): void
  onDoubleClick?(pos: Position, evt: T, modeId: string): void
}
export interface PointerEventHandlersWithLifecycle<T = PdfPointerEvent>
  extends PointerEventHandlers<T> {
  onHandlerActiveStart?(modeId: string): void
  onHandlerActiveEnd?(modeId: string): void
}

const domEventMap: Record<string, keyof PointerEventHandlers> = {
  pointerdown: "onPointerDown",
  pointerup: "onPointerUp",
  pointermove: "onPointerMove",
  pointerenter: "onPointerEnter",
  pointerleave: "onPointerLeave",
  pointercancel: "onPointerCancel",
  mousedown: "onMouseDown",
  mouseup: "onMouseUp",
  mousemove: "onMouseMove",
  mouseenter: "onMouseEnter",
  mouseleave: "onMouseLeave",
  mousecancel: "onMouseCancel",
  click: "onClick",
  dblclick: "onDoubleClick",
  /* touch → pointer fallback for very old browsers */
  touchstart: "onPointerDown",
  touchend: "onPointerUp",
  touchmove: "onPointerMove",
  touchcancel: "onPointerCancel",
}

const pointerEventTypes = [
  "pointerdown",
  "pointerup",
  "pointermove",
  "pointerenter",
  "pointerleave",
  "pointercancel",
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseenter",
  "mouseleave",
  "mousecancel",
  "click",
  "dblclick",
]

const touchEventTypes = ["touchstart", "touchend", "touchmove", "touchcancel"]
const HAS_POINTER = typeof PointerEvent !== "undefined"
const allEventTypes = HAS_POINTER ? pointerEventTypes : [...pointerEventTypes, ...touchEventTypes]

// ***OTHER CUSTOM TYPES***
export interface InteractionExclusionRules {
  classes?: string[]
  dataAttributes?: string[]
}

export interface InteractionMode {
  id: string
  /** where the handlers should listen for events */
  scope: "global" | "page"
  /** if true the page will receive events through a transparent overlay and no other page‑level
   *  listener gets invoked until the mode finishes. */
  exclusive: boolean
  /** baseline cursor while the mode is active (before any handler overrides it). */
  cursor?: string
  /** Set to `false` when this tool wants to disable raw touch events.
   *  Defaults to `true`. */
  wantsRawTouch?: boolean
}

interface GlobalInteractionScope {
  type: "global"
}
interface PageInteractionScope {
  type: "page"
  pageIndex: number
}
export type InteractionScope = GlobalInteractionScope | PageInteractionScope

// *****PLUGIN ESSENTIALS******
// ***ID***
export const INTERACTION_MANAGER_PLUGIN_ID = "interaction-manager"

// ***STATE***
export interface InteractionManagerState {
  activeMode: string
  cursor: string
  paused: boolean
  defaultMode: string
  exclusionRules: InteractionExclusionRules
}

// ***INITIAL STATE***
const INITIAL_MODE = "pointerMode"
const initialState: InteractionManagerState = {
  activeMode: INITIAL_MODE,
  defaultMode: INITIAL_MODE,
  cursor: "auto",
  paused: false,
  exclusionRules: {
    classes: [],
    dataAttributes: [],
  },
}

// ***PLUGIN CAPABILITY***
export interface RegisterHandlersOptions {
  // mode the handlers belon to
  modeId: string | string[]
  // callbacks
  handlers: PointerEventHandlersWithLifecycle
  // if omitted ⇒ handlers listen on the *global* layer
  pageIndex?: number
}
export interface RegisterAlwaysOptions {
  scope: InteractionScope
  handlers: PointerEventHandlersWithLifecycle
}

export interface InteractionManagerCapability {
  /** returns the active mode id */
  getActiveMode(): string
  /** returns the active interaction mode */
  getActiveInteractionMode(): InteractionMode | null
  /** programmatically switch to a mode */
  activate(modeId: string): void
  /** set default mode */
  activateDefaultMode(): void
  /** register a mode (should be called at start‑up by each plugin/tool). */
  registerMode(mode: InteractionMode): void
  /** register pointer handlers that run *only* while the given mode is active. */
  registerHandlers(options: RegisterHandlersOptions): () => void
  /** register pointer handlers that run *always* (even if no mode is active). */
  registerAlways(options: RegisterAlwaysOptions): () => void
  /** low‑level cursor API. Handlers can claim the cursor with a priority (larger wins). */
  setCursor(token: string, cursor: string, priority?: number): void
  /** Returns the current cursor */
  getCurrentCursor(): string
  /** remove a cursor */
  removeCursor(token: string): void
  /** subscribe to mode changes (so framework layers can raise overlays, etc.) */
  onModeChange: EventHook<InteractionManagerState>
  /** subscribe to cursor changes */
  onCursorChange: EventHook<string>
  /** subscribe to handler changes */
  onHandlerChange: EventHook<InteractionManagerState>
  /** subscribe to state changes */
  onStateChange: EventHook<InteractionManagerState>
  /** framework helpers -------------------------------------------------------------- */
  /** Returns the *merged* handler set for the current mode + given scope.
   *  Used by the PointerInteractionProvider inside each page / at the root. */
  getHandlersForScope(scope: InteractionScope): PointerEventHandlers | null
  /** Returns whether the current active mode demands an overlay */
  activeModeIsExclusive(): boolean
  /** Pause the interaction */
  pause(): void
  /** Resume the interaction */
  resume(): void
  /** Returns whether the interaction is paused */
  isPaused(): boolean
  /** Set the default mode */
  setDefaultMode(id: string): void
  /** Get the default mode */
  getDefaultMode(): string
  /** Get current exclusion rules */
  getExclusionRules(): InteractionExclusionRules
  /** Update exclusion rules */
  setExclusionRules(rules: InteractionExclusionRules): void
  /** Add a class to exclusion */
  addExclusionClass(className: string): void
  /** Remove a class from exclusion */
  removeExclusionClass(className: string): void
  /** Add a data attribute to exclusion */
  addExclusionAttribute(attribute: string): void
  /** Remove a data attribute from exclusion */
  removeExclusionAttribute(attribute: string): void
}

// ***ACTION CONSTANTS***
const ACTIVATE_MODE = "INTERACTION/ACTIVATE_MODE"
const PAUSE_INTERACTION = "INTERACTION/PAUSE"
const RESUME_INTERACTION = "INTERACTION/RESUME"
const SET_CURSOR = "INTERACTION/SET_CURSOR"
const SET_DEFAULT_MODE = "INTERACTION/SET_DEFAULT_MODE"
const SET_EXCLUSION_RULES = "INTERACTION/SET_EXCLUSION_RULES"
const ADD_EXCLUSION_CLASS = "INTERACTION/ADD_EXCLUSION_CLASS"
const REMOVE_EXCLUSION_CLASS = "INTERACTION/REMOVE_EXCLUSION_CLASS"
const ADD_EXCLUSION_ATTRIBUTE = "INTERACTION/ADD_EXCLUSION_ATTRIBUTE"
const REMOVE_EXCLUSION_ATTRIBUTE = "INTERACTION/REMOVE_EXCLUSION_ATTRIBUTE"

// ***ACTION INTERFACES***
interface SetExclusionRulesAction extends Action {
  type: typeof SET_EXCLUSION_RULES
  payload: {
    rules: InteractionExclusionRules
  }
}
interface AddExclusionClassAction extends Action {
  type: typeof ADD_EXCLUSION_CLASS
  payload: {
    className: string
  }
}
interface RemoveExclusionClassAction extends Action {
  type: typeof REMOVE_EXCLUSION_CLASS
  payload: {
    className: string
  }
}
interface AddExclusionAttributeAction extends Action {
  type: typeof ADD_EXCLUSION_ATTRIBUTE
  payload: {
    attribute: string
  }
}
interface RemoveExclusionAttributeAction extends Action {
  type: typeof REMOVE_EXCLUSION_ATTRIBUTE
  payload: {
    attribute: string
  }
}
interface ActivateModeAction extends Action {
  type: typeof ACTIVATE_MODE
  payload: {
    mode: string
  }
}
interface PauseInteractionAction extends Action {
  type: typeof PAUSE_INTERACTION
}
interface ResumeInteractionAction extends Action {
  type: typeof RESUME_INTERACTION
}
interface SetCursorAction extends Action {
  type: typeof SET_CURSOR
  payload: {
    cursor: string
  }
}
interface SetDefaultModeAction extends Action {
  type: typeof SET_DEFAULT_MODE
  payload: {
    mode: string
  }
}

// ***ACTION UNION***
export type InteractionManagerAction =
  | SetExclusionRulesAction
  | AddExclusionClassAction
  | RemoveExclusionClassAction
  | AddExclusionAttributeAction
  | RemoveExclusionAttributeAction
  | ActivateModeAction
  | PauseInteractionAction
  | ResumeInteractionAction
  | SetCursorAction
  | SetDefaultModeAction

// ***ACTION CREATORS***
const setExclusionRules = (rules: InteractionExclusionRules): SetExclusionRulesAction => ({
  type: SET_EXCLUSION_RULES,
  payload: { rules },
})
const addExclusionClass = (className: string): AddExclusionClassAction => ({
  type: ADD_EXCLUSION_CLASS,
  payload: { className },
})
const removeExclusionClass = (className: string): RemoveExclusionClassAction => ({
  type: REMOVE_EXCLUSION_CLASS,
  payload: { className },
})
const addExclusionAttribute = (attribute: string): AddExclusionAttributeAction => ({
  type: ADD_EXCLUSION_ATTRIBUTE,
  payload: { attribute },
})
const removeExclusionAttribute = (attribute: string): RemoveExclusionAttributeAction => ({
  type: REMOVE_EXCLUSION_ATTRIBUTE,
  payload: { attribute },
})
const activateMode = (mode: string): ActivateModeAction => ({
  type: ACTIVATE_MODE,
  payload: { mode },
})
const setCursor = (cursor: string): SetCursorAction => ({
  type: SET_CURSOR,
  payload: { cursor },
})
const setDefaultMode = (mode: string): SetDefaultModeAction => ({
  type: SET_DEFAULT_MODE,
  payload: { mode },
})
const pauseInteraction = (): PauseInteractionAction => ({
  type: PAUSE_INTERACTION,
})
const resumeInteraction = (): ResumeInteractionAction => ({
  type: RESUME_INTERACTION,
})

// ***ACTION REDUCER***
const reducer: Reducer<InteractionManagerState, InteractionManagerAction> = (
  state: InteractionManagerState,
  action: InteractionManagerAction,
) => {
  switch (action.type) {
    case ACTIVATE_MODE:
      return {
        ...state,
        activeMode: action.payload.mode,
      }
    case SET_CURSOR:
      return {
        ...state,
        cursor: action.payload.cursor,
      }
    case PAUSE_INTERACTION:
      return {
        ...state,
        paused: true,
      }
    case RESUME_INTERACTION:
      return {
        ...state,
        paused: false,
      }
    case SET_DEFAULT_MODE:
      return {
        ...state,
        defaultMode: action.payload.mode,
      }
    case SET_EXCLUSION_RULES:
      return {
        ...state,
        exclusionRules: action.payload.rules,
      }
    case ADD_EXCLUSION_CLASS:
      return {
        ...state,
        exclusionRules: {
          ...state.exclusionRules,
          classes: [...(state.exclusionRules.classes || []), action.payload.className].filter(
            (v, i, a) => a.indexOf(v) === i,
          ),
          // Remove duplicates
        },
      }
    case REMOVE_EXCLUSION_CLASS:
      return {
        ...state,
        exclusionRules: {
          ...state.exclusionRules,
          classes: (state.exclusionRules.classes || []).filter(
            (c) => c !== action.payload.className,
          ),
        },
      }
    case ADD_EXCLUSION_ATTRIBUTE:
      return {
        ...state,
        exclusionRules: {
          ...state.exclusionRules,
          dataAttributes: [
            ...(state.exclusionRules.dataAttributes || []),
            action.payload.attribute,
          ].filter((v, i, a) => a.indexOf(v) === i),
        },
      }
    case REMOVE_EXCLUSION_ATTRIBUTE:
      return {
        ...state,
        exclusionRules: {
          ...state.exclusionRules,
          dataAttributes: (state.exclusionRules.dataAttributes || []).filter(
            (a) => a !== action.payload.attribute,
          ),
        },
      }
    default:
      return state
  }
}

// ***PLUGIN CONFIG***
export interface InteractionManagerPluginConfig extends BasePluginConfig {
  exclusionRules?: InteractionExclusionRules
}

// ***PLUGIN CLASS***
export class InteractionManagerPlugin extends BasePlugin<
  InteractionManagerPluginConfig,
  InteractionManagerCapability,
  InteractionManagerState,
  InteractionManagerAction
> {
  static readonly id: string = INTERACTION_MANAGER_PLUGIN_ID

  private modes: Map<string, InteractionMode> = new Map()
  private cursorClaims: Map<string, { cursor: string; priority: number }> = new Map()
  private buckets: Map<
    string,
    {
      global: Set<PointerEventHandlersWithLifecycle>
      page: Map<number, Set<PointerEventHandlersWithLifecycle>>
    }
  > = new Map()
  private alwaysGlobal: Set<PointerEventHandlersWithLifecycle> =
    new Set<PointerEventHandlersWithLifecycle>()
  private alwaysPage: Map<number, Set<PointerEventHandlersWithLifecycle>> = new Map<
    number,
    Set<PointerEventHandlersWithLifecycle>
  >()

  private readonly onModeChange$ = createEmitter<InteractionManagerState>()
  private readonly onHandlerChange$ = createEmitter<InteractionManagerState>()
  private readonly onCursorChange$ = createEmitter<string>()
  private readonly onStateChange$ = createBehaviorEmitter<InteractionManagerState>()

  constructor(id: string, registry: PluginRegistry, config: InteractionManagerPluginConfig) {
    super(id, registry)
    this.registerMode({
      id: INITIAL_MODE,
      scope: "page",
      exclusive: false,
      cursor: "auto",
    })
    this.setDefaultMode(INITIAL_MODE)
    this.activate(INITIAL_MODE)
    if (config.exclusionRules) {
      this.dispatch(setExclusionRules(config.exclusionRules))
    }
  }

  async initialize(_: InteractionManagerPluginConfig): Promise<void> {}

  protected buildCapability(): InteractionManagerCapability {
    return {
      activate: (modeId: string) => this.activate(modeId),
      onModeChange: this.onModeChange$.on,
      onCursorChange: this.onCursorChange$.on,
      onHandlerChange: this.onHandlerChange$.on,
      onStateChange: this.onStateChange$.on,
      getActiveMode: (): string => this.state.activeMode,
      getActiveInteractionMode: (): InteractionMode | null => this.getActiveInteractionMode(),
      activateDefaultMode: (): void => this.activate(this.state.defaultMode),
      registerMode: (mode: InteractionMode): void => this.registerMode(mode),
      registerHandlers: (options: RegisterHandlersOptions): (() => void) =>
        this.registerHandlers(options),
      registerAlways: (options: RegisterAlwaysOptions): (() => void) =>
        this.registerAlways(options),
      setCursor: (token: string, cursor: string, priority: number = 0): void =>
        this.setCursor(token, cursor, priority),
      removeCursor: (token: string): void => this.removeCursor(token),
      getCurrentCursor: (): string => this.state.cursor,
      getHandlersForScope: (scope: InteractionScope): PointerEventHandlers | null =>
        this.getHandlersForScope(scope),
      activeModeIsExclusive: (): boolean => this.activeModeIsExclusive(),
      pause: () => this.dispatch(pauseInteraction()),
      resume: () => this.dispatch(resumeInteraction()),
      isPaused: (): boolean => this.state.paused,
      setDefaultMode: (id: string): void => this.setDefaultMode(id),
      getDefaultMode: (): string => this.state.defaultMode,
      getExclusionRules: (): InteractionExclusionRules => this.state.exclusionRules,
      setExclusionRules: (rules: InteractionExclusionRules) =>
        this.dispatch(setExclusionRules(rules)),
      addExclusionClass: (className: string) => this.dispatch(addExclusionClass(className)),
      removeExclusionClass: (className: string) => this.dispatch(removeExclusionClass(className)),
      addExclusionAttribute: (attribute: string) => this.dispatch(addExclusionAttribute(attribute)),
      removeExclusionAttribute: (attribute: string) =>
        this.dispatch(removeExclusionAttribute(attribute)),
    }
  }

  private activate(mode: string): void {
    if (!this.modes.has(mode)) {
      throw new Error(`[interaction] unknown mode '${mode}'`)
    }
    if (mode === this.state.activeMode) return
    const previousMode = this.state.activeMode
    this.cursorClaims.clear()
    this.notifyHandlersInactive(previousMode)
    this.dispatch(activateMode(mode))
    this.emitCursor()
    this.notifyHandlersActive(mode)
    this.onModeChange$.emit({ ...this.state, activeMode: mode })
  }

  private setDefaultMode(modeId: string): void {
    if (!this.modes.has(modeId)) {
      throw new Error(`[interaction] cannot set unknown mode '${modeId}' as default`)
    }
    this.dispatch(setDefaultMode(modeId))
  }

  private notifyHandlersActive(modeId: string): void {
    this.alwaysGlobal.forEach((handler) => {
      handler.onHandlerActiveStart?.(modeId)
    })
    this.alwaysPage.forEach((handlerSet) => {
      handlerSet.forEach((handler) => {
        handler.onHandlerActiveStart?.(modeId)
      })
    })
    const mode = this.modes.get(modeId)
    if (!mode) return
    const bucket = this.buckets.get(modeId)
    if (!bucket) return
    if (mode.scope === "global") {
      bucket.global.forEach((handler) => {
        handler.onHandlerActiveStart?.(modeId)
      })
    }
    if (mode.scope === "page") {
      bucket.page.forEach((handlerSet, _pageIndex) => {
        handlerSet.forEach((handler) => {
          handler.onHandlerActiveStart?.(modeId)
        })
      })
    }
  }
  private notifyHandlersInactive(modeId: string): void {
    this.alwaysGlobal.forEach((handler) => {
      handler.onHandlerActiveEnd?.(modeId)
    })
    this.alwaysPage.forEach((handlerSet) => {
      handlerSet.forEach((handler) => {
        handler.onHandlerActiveEnd?.(modeId)
      })
    })
    const mode = this.modes.get(modeId)
    if (!mode) return
    const bucket = this.buckets.get(modeId)
    if (!bucket) return
    if (mode.scope === "global") {
      bucket.global.forEach((handler) => {
        handler.onHandlerActiveEnd?.(modeId)
      })
    }
    if (mode.scope === "page") {
      bucket.page.forEach((handlerSet, _pageIndex) => {
        handlerSet.forEach((handler) => {
          handler.onHandlerActiveEnd?.(modeId)
        })
      })
    }
  }

  private registerMode(mode: InteractionMode): void {
    this.modes.set(mode.id, mode)
    if (!this.buckets.has(mode.id)) {
      this.buckets.set(mode.id, { global: new Set(), page: new Map() })
    }
  }

  /** ---------- pointer-handler handling ------------ */
  private registerHandlers({ modeId, handlers, pageIndex }: RegisterHandlersOptions): () => void {
    const modeIds = Array.isArray(modeId) ? modeId : [modeId]
    const cleanupFunctions: (() => void)[] = []
    for (const id of modeIds) {
      const bucket = this.buckets.get(id)
      if (!bucket) throw new Error(`unknown mode '${id}'`)
      if (pageIndex == null) {
        bucket.global.add(handlers)
      } else {
        const set = bucket.page.get(pageIndex) ?? new Set()
        set.add(handlers)
        bucket.page.set(pageIndex, set)
      }
      cleanupFunctions.push(() => {
        if (pageIndex == null) {
          bucket.global.delete(handlers)
        } else {
          const set = bucket.page.get(pageIndex)
          if (set) {
            set.delete(handlers)
            if (set.size === 0) {
              bucket.page.delete(pageIndex)
            }
          }
        }
      })
    }
    this.onHandlerChange$.emit({ ...this.state })
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup())
      this.onHandlerChange$.emit({ ...this.state })
    }
  }
  registerAlways({ scope, handlers }: RegisterAlwaysOptions): () => void {
    if (scope.type === "global") {
      this.alwaysGlobal.add(handlers)
      this.onHandlerChange$.emit({ ...this.state })
      return () => this.alwaysGlobal.delete(handlers)
    }
    const set = this.alwaysPage.get(scope.pageIndex) ?? new Set()
    set.add(handlers)
    this.alwaysPage.set(scope.pageIndex, set)
    this.onHandlerChange$.emit({ ...this.state })
    return () => {
      set.delete(handlers)
      this.onHandlerChange$.emit({ ...this.state })
    }
  }

  /** Returns the *merged* handler set that should be active for the given
   *  provider (`global` wrapper or a single page wrapper).
   *  – `alwaysGlobal` / `alwaysPage` are **always** active.
   *  – Handlers that belong to the current mode are added on top **iff**
   *    the mode's own scope matches the provider's scope.            */
  private getHandlersForScope(scope: InteractionScope): PointerEventHandlers | null {
    if (!this.state) return null
    const mode = this.modes.get(this.state.activeMode)
    if (!mode) return null
    const bucket = this.buckets.get(mode.id)
    if (!bucket) return null
    const mergeSets = (
      a: Set<PointerEventHandlersWithLifecycle>,
      b: Set<PointerEventHandlersWithLifecycle>,
    ) => (a.size || b.size ? mergeHandlers([...a, ...b] as PointerEventHandlers[]) : null)
    if (scope.type === "global") {
      const modeSpecific = mode.scope === "global" ? bucket.global : new Set()
      return mergeSets(
        this.alwaysGlobal as Set<PointerEventHandlersWithLifecycle>,
        modeSpecific as Set<PointerEventHandlersWithLifecycle>,
      )
    }
    const alwaysPageSet = this.alwaysPage.get(scope.pageIndex) ?? new Set()
    const modePageSet =
      mode.scope === "page" ? (bucket.page.get(scope.pageIndex) ?? new Set()) : new Set()
    return mergeSets(
      alwaysPageSet as Set<PointerEventHandlersWithLifecycle>,
      modePageSet as Set<PointerEventHandlersWithLifecycle>,
    )
  }

  /** ---------- cursor handling --------------------- */
  private setCursor(token: string, cursor: string, priority: number = 0): void {
    this.cursorClaims.set(token, { cursor, priority })
    this.emitCursor()
  }
  private removeCursor(token: string): void {
    this.cursorClaims.delete(token)
    this.emitCursor()
  }
  private emitCursor(): void {
    const top = [...this.cursorClaims.values()].sort((a, b) => b.priority - a.priority)[0] ?? {
      cursor: this.modes.get(this.state.activeMode)?.cursor ?? "auto",
    }
    if (top.cursor !== this.state.cursor) {
      this.dispatch(setCursor(top.cursor))
      this.onCursorChange$.emit(top.cursor)
    }
  }

  // standard function for plugins to enable client program changing state
  onStoreUpdated(_: InteractionManagerState, newState: InteractionManagerState): void {
    this.onStateChange$.emit(newState)
  }

  private activeModeIsExclusive(): boolean {
    const mode = this.modes.get(this.state.activeMode)
    return !!mode?.exclusive
  }
  private getActiveInteractionMode(): InteractionMode | null {
    return this.modes.get(this.state.activeMode) ?? null
  }

  // keep emitter clean
  async destroy(): Promise<void> {
    this.onModeChange$.clear()
    this.onCursorChange$.clear()
    await super.destroy()
  }
}

// ***MANIFEST***
const manifest: PluginManifest<InteractionManagerPluginConfig> = {
  id: INTERACTION_MANAGER_PLUGIN_ID,
  name: "Interaction Manager Plugin",
  version: "1.0.0",
  provides: [INTERACTION_MANAGER_PLUGIN_ID],
  requires: [],
  optional: [],
  defaultConfig: {
    enabled: true,
    exclusionRules: {
      classes: [],
      dataAttributes: ["data-no-interaction"],
    },
  },
}

// ***PLUGIN PACKAGE***
export const InteractionManagerPluginPackage: PluginPackage<
  InteractionManagerPlugin,
  InteractionManagerPluginConfig,
  InteractionManagerState,
  InteractionManagerAction
> = {
  manifest,
  create: (registry: PluginRegistry, config: InteractionManagerPluginConfig) =>
    new InteractionManagerPlugin(INTERACTION_MANAGER_PLUGIN_ID, registry, config),
  reducer,
  initialState,
}

// ***PLUGIN HOOKS***
export const useInteractionManagerPlugin = () => usePlugin(InteractionManagerPlugin.id)
export const useInteractionManagerCapability = () => useCapability(InteractionManagerPlugin.id)

// *****CUSTOM HOOKS*****
export function useInteractionManager(): {
  provides: Readonly<InteractionManagerCapability> | null
  state: InteractionManagerState
} {
  const { provides } = useInteractionManagerCapability()
  const [state, setState] = useState<InteractionManagerState>(initialState)
  useEffect(() => {
    if (!provides) return
    return (provides as Readonly<InteractionManagerCapability>).onStateChange(
      (state2: InteractionManagerState) => {
        setState(state2)
      },
    )
  }, [provides])
  return {
    provides: provides as Readonly<InteractionManagerCapability> | null,
    state,
  }
}
export function useCursor(): {
  setCursor: (token: string, cursor: string, prio?: number) => void
  removeCursor: (token: string) => void
} {
  const { provides } = useInteractionManagerCapability()
  return {
    setCursor: (token: string, cursor: string, prio: number = 0) => {
      ;(provides as Readonly<InteractionManagerCapability>)?.setCursor(token, cursor, prio)
    },
    removeCursor: (token: string) => {
      ;(provides as Readonly<InteractionManagerCapability>)?.removeCursor(token)
    },
  }
}
export function usePointerHandlers({
  modeId,
  pageIndex,
}: {
  modeId?: string | string[]
  pageIndex?: number
}): {
  register: (
    handlers: PointerEventHandlersWithLifecycle,
    options?: {
      modeId?: string | string[]
      pageIndex?: number
    },
  ) => (() => void) | undefined
} {
  const { provides } = useInteractionManagerCapability()
  return {
    register: (handlers: PointerEventHandlersWithLifecycle, options) => {
      const finalModeId = options?.modeId ?? modeId
      const finalPageIndex = options?.pageIndex ?? pageIndex
      return finalModeId
        ? (provides as Readonly<InteractionManagerCapability>)?.registerHandlers({
            modeId: finalModeId,
            handlers,
            pageIndex: finalPageIndex,
          })
        : (provides as Readonly<InteractionManagerCapability>)?.registerAlways({
            scope:
              finalPageIndex !== void 0
                ? { type: "page", pageIndex: finalPageIndex }
                : { type: "global" },
            handlers,
          })
    },
  }
}
export function useIsPageExclusive(): boolean {
  const { provides: cap } = useInteractionManagerCapability()
  const [isPageExclusive, setIsPageExclusive] = useState<boolean>(() => {
    const m = (cap as Readonly<InteractionManagerCapability>)?.getActiveInteractionMode()
    return m?.scope === "page" && !!m.exclusive
  })
  useEffect(() => {
    if (!cap) return
    return (cap as Readonly<InteractionManagerCapability>).onModeChange(() => {
      const mode = (cap as Readonly<InteractionManagerCapability>).getActiveInteractionMode()
      setIsPageExclusive(mode?.scope === "page" && !!mode?.exclusive)
    })
  }, [cap])
  return isPageExclusive
}

// *****HELPER FUNCTIONS*****
function mergeHandlers(list: PointerEventHandlers[]): PointerEventHandlers {
  const keys: (keyof PointerEventHandlers)[] = [
    "onPointerDown",
    "onPointerUp",
    "onPointerMove",
    "onPointerEnter",
    "onPointerLeave",
    "onPointerCancel",
    "onMouseDown",
    "onMouseUp",
    "onMouseMove",
    "onMouseEnter",
    "onMouseLeave",
    "onMouseCancel",
    "onClick",
    "onDoubleClick",
  ]
  const out: PointerEventHandlers = {}
  for (const k of keys) {
    out[k] = (evt: Position, nativeEvt: PdfPointerEvent, modeId: string) => {
      for (const h of list) {
        h[k]?.(evt, nativeEvt, modeId)
      }
    }
  }
  return out
}

function listenerOpts(eventType: string, wantsRawTouch: boolean): AddEventListenerOptions {
  return eventType.startsWith("touch") ? { passive: !wantsRawTouch } : { passive: false }
}

function isTouchEvent(evt: Event): evt is TouchEvent {
  return typeof TouchEvent !== "undefined" && evt instanceof TouchEvent
}

function shouldExcludeElement(element: Element | null, rules: InteractionExclusionRules): boolean {
  if (!element) return false
  let current: Element | null = element
  while (current) {
    if (rules.classes?.length) {
      for (const className of rules.classes) {
        if (current.classList.contains(className)) {
          return true
        }
      }
    }
    if (rules.dataAttributes?.length) {
      for (const attr of rules.dataAttributes) {
        if (current.hasAttribute(attr)) {
          return true
        }
      }
    }
    current = current.parentElement
  }
  return false
}

// *****COMPONENTS*****
function createPointerProvider(
  cap: InteractionManagerCapability,
  scope: InteractionScope,
  element: HTMLElement,
  convertEventToPoint?: (evt: PointerEvent, host: HTMLElement) => Position,
): () => void {
  let active = cap.getHandlersForScope(scope)
  const wantsRawTouchNow = (): boolean => {
    return cap.getActiveInteractionMode()?.wantsRawTouch !== false
  }
  const listeners: Record<string, EventListener> = {}
  let attachedWithRawTouch = wantsRawTouchNow()

  const addListeners = (raw: boolean): void => {
    allEventTypes.forEach((type) => {
      const fn = listeners[type] ?? (listeners[type] = handleEvent)
      element.addEventListener(type, fn, listenerOpts(type, raw))
    })
  }

  const removeListeners = (): void => {
    allEventTypes.forEach((type) => {
      const fn = listeners[type]
      if (fn) element.removeEventListener(type, fn)
    })
  }

  addListeners(attachedWithRawTouch)
  element.style.touchAction = attachedWithRawTouch ? "none" : ""

  const stopMode = cap.onModeChange(() => {
    if (scope.type === "global") {
      const mode = cap.getActiveInteractionMode()
      element.style.cursor = mode?.scope === "global" ? (mode.cursor ?? "auto") : "auto"
    }
    active = cap.getHandlersForScope(scope)
    const raw = wantsRawTouchNow()
    if (raw !== attachedWithRawTouch) {
      removeListeners()
      addListeners(raw)
      attachedWithRawTouch = raw
      element.style.touchAction = attachedWithRawTouch ? "none" : ""
    }
  })

  const stopHandler = cap.onHandlerChange(() => {
    active = cap.getHandlersForScope(scope)
  })

  const initialMode = cap.getActiveInteractionMode()
  const initialCursor = cap.getCurrentCursor()
  element.style.cursor =
    scope.type === "global" && initialMode?.scope !== "global" ? "auto" : initialCursor

  const stopCursor = cap.onCursorChange((c: string) => {
    if (scope.type === "global" && cap.getActiveInteractionMode()?.scope !== "global") return
    element.style.cursor = c
  })

  const toPos = (e: PointerEvent | Touch, host: HTMLElement): Position => {
    if (convertEventToPoint) return convertEventToPoint(e as PointerEvent, host)
    const r = host.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function handleEvent(evt: Event): void {
    if (cap.isPaused()) return
    const exclusionRules = cap.getExclusionRules()
    if (evt.target && shouldExcludeElement(evt.target as Element, exclusionRules)) {
      return
    }
    const handlerKey = domEventMap[evt.type]
    if (!handlerKey || !active?.[handlerKey]) return
    if (
      isTouchEvent(evt) &&
      attachedWithRawTouch &&
      (evt.type === "touchmove" || evt.type === "touchcancel")
    ) {
      evt.preventDefault()
    }
    let pos: Position
    let normEvt: PdfPointerEvent
    if (isTouchEvent(evt)) {
      const tp =
        evt.type === "touchend" || evt.type === "touchcancel"
          ? evt.changedTouches[0]
          : evt.touches[0]
      if (!tp) return
      pos = toPos(tp, element)
      normEvt = {
        clientX: tp.clientX,
        clientY: tp.clientY,
        ctrlKey: evt.ctrlKey,
        shiftKey: evt.shiftKey,
        altKey: evt.altKey,
        metaKey: evt.metaKey,
        target: evt.target,
        currentTarget: evt.currentTarget,
        setPointerCapture: () => {},
        releasePointerCapture: () => {},
      }
    } else {
      const pe = evt as PointerEvent
      pos = toPos(pe, element)
      normEvt = {
        clientX: pe.clientX,
        clientY: pe.clientY,
        ctrlKey: pe.ctrlKey,
        shiftKey: pe.shiftKey,
        altKey: pe.altKey,
        metaKey: pe.metaKey,
        target: pe.target,
        currentTarget: pe.currentTarget,
        setPointerCapture: () => {
          const target = pe.target as HTMLElement
          target?.setPointerCapture?.(pe.pointerId)
        },
        releasePointerCapture: () => {
          const target = pe.target as HTMLElement
          target?.releasePointerCapture?.(pe.pointerId)
        },
      }
    }
    active[handlerKey]?.(pos, normEvt, cap.getActiveMode())
  }

  return () => {
    removeListeners()
    stopMode()
    stopCursor()
    stopHandler()
  }
}

interface GlobalPointerProviderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  style?: CSSProperties
}

export const GlobalPointerProvider = ({
  children,
  style,
  ...props
}: GlobalPointerProviderProps): React.JSX.Element => {
  const ref = useRef<HTMLDivElement>(null)
  const { provides: cap } = useInteractionManagerCapability()
  useEffect(() => {
    if (!cap || !ref.current) return
    return createPointerProvider(
      cap as InteractionManagerCapability,
      { type: "global" },
      ref.current,
    )
  }, [cap])
  return jsx("div", {
    ref,
    style: {
      width: "100%",
      height: "100%",
      ...style,
    },
    ...props,
    children,
  })
}

interface PagePointerProviderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  pageIndex: number
  pageWidth: number
  pageHeight: number
  rotation: number
  scale: number
  style?: CSSProperties
  convertEventToPoint?: (event: PointerEvent, element: HTMLElement) => Position
}

export const PagePointerProvider = ({
  pageIndex,
  children,
  pageWidth,
  pageHeight,
  rotation,
  scale,
  convertEventToPoint,
  style,
  ...props
}: PagePointerProviderProps): React.JSX.Element => {
  const ref = useRef<HTMLDivElement>(null)
  const { provides: cap } = useInteractionManagerCapability()
  const isPageExclusive = useIsPageExclusive()
  const defaultConvertEventToPoint = useCallback(
    (event: PointerEvent, element: HTMLElement): Position => {
      const rect = element.getBoundingClientRect()
      const displayPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
      const displaySize = transformSize({ width: pageWidth, height: pageHeight }, rotation, 1)
      return restorePosition(displaySize, displayPoint, rotation, scale)
    },
    [pageWidth, pageHeight, rotation, scale],
  )
  useEffect(() => {
    if (!cap || !ref.current) return
    return createPointerProvider(
      cap as InteractionManagerCapability,
      { type: "page", pageIndex },
      ref.current,
      convertEventToPoint || defaultConvertEventToPoint,
    )
  }, [cap, pageIndex, convertEventToPoint, defaultConvertEventToPoint])
  return jsxs("div", {
    ref,
    style: {
      position: "relative",
      width: pageWidth,
      height: pageHeight,
      ...style,
    },
    ...props,
    children: [
      children,
      isPageExclusive &&
        jsx("div", {
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
          },
        }),
    ],
  })
}
