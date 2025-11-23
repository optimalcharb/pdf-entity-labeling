import {
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  createEmitter,
  EventHook,
  PluginRegistry,
} from "@embedpdf/core"
import type { InteractionManagerAction } from "./actions"
import {
  activateMode,
  addExclusionAttribute,
  addExclusionClass,
  pauseInteraction,
  removeExclusionAttribute,
  removeExclusionClass,
  resumeInteraction,
  setCursor,
  setDefaultMode,
  setExclusionRules,
} from "./actions"
import {
  CursorClaim,
  HandlerSet,
  InteractionExclusionRules,
  InteractionMode,
  InteractionScope,
  ModeBuckets,
  PointerEventHandlers,
  PointerEventHandlersWithLifecycle,
  RegisterAlwaysOptions,
  RegisterHandlersOptions,
} from "./custom-types"
import { InteractionManagerState } from "./state"
import { mergeHandlers } from "./utils"

// ***PLUGIN CONFIG***
export interface InteractionManagerPluginConfig extends BasePluginConfig {
  /** Initial exclusion rules */
  exclusionRules?: InteractionExclusionRules
}

// ***PLUGIN CAPABILITY***
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

// ***PLUGIN CLASS***
const INITIAL_MODE = "pointerMode"
export class InteractionManagerPlugin extends BasePlugin<
  InteractionManagerPluginConfig,
  InteractionManagerCapability,
  InteractionManagerState,
  InteractionManagerAction
> {
  static readonly id = "interaction-manager" as const

  private modes = new Map<string, InteractionMode>()
  private cursorClaims = new Map<string, CursorClaim>()
  private buckets = new Map<string, ModeBuckets>()

  private alwaysGlobal = new Set<PointerEventHandlersWithLifecycle>()
  private alwaysPage = new Map<number, Set<PointerEventHandlersWithLifecycle>>()

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
      getActiveMode: () => this.state.activeMode,
      getActiveInteractionMode: () => this.getActiveInteractionMode(),
      activateDefaultMode: () => this.activate(this.state.defaultMode),
      registerMode: (mode: InteractionMode) => this.registerMode(mode),
      registerHandlers: (options: RegisterHandlersOptions) => this.registerHandlers(options),
      registerAlways: (options: RegisterAlwaysOptions) => this.registerAlways(options),
      setCursor: (token: string, cursor: string, priority = 0) =>
        this.setCursor(token, cursor, priority),
      removeCursor: (token: string) => this.removeCursor(token),
      getCurrentCursor: () => this.state.cursor,
      getHandlersForScope: (scope: InteractionScope) => this.getHandlersForScope(scope),
      activeModeIsExclusive: () => this.activeModeIsExclusive(),
      pause: () => this.dispatch(pauseInteraction()),
      resume: () => this.dispatch(resumeInteraction()),
      // Treat a destroyed registry as "paused" so late DOM events are ignored during teardown.
      isPaused: () => this.registry.isDestroyed() || this.state.paused,
      setDefaultMode: (id: string) => this.setDefaultMode(id),
      getDefaultMode: () => this.state.defaultMode,
      getExclusionRules: () => this.state.exclusionRules,
      setExclusionRules: (rules: InteractionExclusionRules) =>
        this.dispatch(setExclusionRules(rules)),
      addExclusionClass: (className: string) => this.dispatch(addExclusionClass(className)),
      removeExclusionClass: (className: string) => this.dispatch(removeExclusionClass(className)),
      addExclusionAttribute: (attribute: string) => this.dispatch(addExclusionAttribute(attribute)),
      removeExclusionAttribute: (attribute: string) =>
        this.dispatch(removeExclusionAttribute(attribute)),
    }
  }

  private activate(mode: string) {
    if (!this.modes.has(mode)) {
      throw new Error(`[interaction] unknown mode '${mode}'`)
    }
    if (mode === this.state.activeMode) return

    const previousMode = this.state.activeMode
    this.cursorClaims.clear() // prevent cursor leaks

    this.notifyHandlersInactive(previousMode)

    this.dispatch(activateMode(mode))
    this.emitCursor()

    // Call lifecycle hooks for handlers going active
    this.notifyHandlersActive(mode)

    this.onModeChange$.emit({ ...this.state, activeMode: mode })
  }

  private setDefaultMode(modeId: string) {
    if (!this.modes.has(modeId)) {
      throw new Error(`[interaction] cannot set unknown mode '${modeId}' as default`)
    }
    this.dispatch(setDefaultMode(modeId))
  }

  private notifyHandlersActive(modeId: string) {
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

    // Notify global handlers if mode is global
    if (mode.scope === "global") {
      bucket.global.forEach((handler) => {
        handler.onHandlerActiveStart?.(modeId)
      })
    }

    // Notify page handlers if mode is page
    if (mode.scope === "page") {
      bucket.page.forEach((handlerSet, pageIndex) => {
        const _pageIndex = pageIndex // to stop lint error
        handlerSet.forEach((handler) => {
          handler.onHandlerActiveStart?.(modeId)
        })
      })
    }
  }

  private notifyHandlersInactive(modeId: string) {
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

    // Notify global handlers if mode is global
    if (mode.scope === "global") {
      bucket.global.forEach((handler) => {
        handler.onHandlerActiveEnd?.(modeId)
      })
    }

    // Notify page handlers if mode is page
    if (mode.scope === "page") {
      bucket.page.forEach((handlerSet, pageIndex) => {
        const _pageIndex = pageIndex // to stop lint error
        handlerSet.forEach((handler) => {
          handler.onHandlerActiveEnd?.(modeId)
        })
      })
    }
  }

  private registerMode(mode: InteractionMode) {
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

      // Create cleanup function for this specific mode
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

    // Return a cleanup function that removes handlers from all registered modes
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup())
      this.onHandlerChange$.emit({ ...this.state })
    }
  }

  public registerAlways({ scope, handlers }: RegisterAlwaysOptions): () => void {
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
   *    the mode’s own scope matches the provider’s scope.            */
  private getHandlersForScope(scope: InteractionScope): PointerEventHandlers | null {
    if (!this.state) return null

    const mode = this.modes.get(this.state.activeMode)
    if (!mode) return null

    const bucket = this.buckets.get(mode.id)
    if (!bucket) return null

    /** helper – merge two handler sets into one object (or `null` if both are empty) */
    const mergeSets = (a: HandlerSet, b: HandlerSet) =>
      a.size || b.size ? mergeHandlers([...a, ...b]) : null

    /* ─────────────────────  GLOBAL PROVIDER  ─────────────────────── */
    if (scope.type === "global") {
      const modeSpecific =
        mode.scope === "global" // only include mode handlers if the
          ? bucket.global // mode itself is global-scoped
          : new Set<PointerEventHandlers>()
      return mergeSets(this.alwaysGlobal, modeSpecific)
    }

    /* ───────────────────────  PAGE PROVIDER  ──────────────────────── */
    const alwaysPageSet = this.alwaysPage.get(scope.pageIndex) ?? new Set<PointerEventHandlers>()
    const modePageSet =
      mode.scope === "page"
        ? (bucket.page.get(scope.pageIndex) ?? new Set<PointerEventHandlers>())
        : new Set<PointerEventHandlers>() // global-scoped mode → ignore page buckets

    return mergeSets(alwaysPageSet, modePageSet)
  }

  /** ---------- cursor handling --------------------- */
  private setCursor(token: string, cursor: string, priority = 0) {
    this.cursorClaims.set(token, { cursor, priority })
    this.emitCursor()
  }
  private removeCursor(token: string) {
    this.cursorClaims.delete(token)
    this.emitCursor()
  }

  private emitCursor() {
    /* pick highest priority claim, else mode baseline */
    const top = [...this.cursorClaims.values()].sort((a, b) => b.priority - a.priority)[0] ?? {
      cursor: this.modes.get(this.state.activeMode)?.cursor ?? "auto",
    }

    if (top.cursor !== this.state.cursor) {
      this.dispatch(setCursor(top.cursor))
      this.onCursorChange$.emit(top.cursor)
    }
  }

  override onStoreUpdated(_: InteractionManagerState, newState: InteractionManagerState): void {
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
