import { Logger, PdfEngine } from "../models"
import { IPlugin } from "./plugin"
import { PluginRegistry } from "./plugin-registry"
import { Action, CoreAction, CoreState, PluginStore, Store, StoreState } from "../store"

export interface StateChangeHandler<TState> {
  (state: TState): void
}

export declare abstract class BasePlugin<
  TConfig = unknown,
  TCapability = unknown,
  TState = unknown,
  TAction extends Action = Action,
> implements IPlugin<TConfig>
{
  readonly id: string
  protected registry: PluginRegistry
  static readonly id: string
  protected pluginStore: PluginStore<TState, TAction>
  protected coreStore: Store<CoreState, CoreAction>
  protected readonly logger: Logger
  protected readonly engine: PdfEngine
  private cooldownActions
  private debouncedTimeouts
  private unsubscribeFromState
  private unsubscribeFromCoreStore
  private _capability?
  private readyPromise
  private readyResolve
  constructor(id: string, registry: PluginRegistry)
  /** Construct the public capability (called once & cached). */
  protected abstract buildCapability(): TCapability
  provides(): Readonly<TCapability>
  /**
   * Initialize plugin with config
   */
  abstract initialize(config: TConfig): Promise<void>
  /**
   *  Get a copy of the current state
   */
  protected get state(): Readonly<TState>
  /**
   *  Get a copy of the current core state
   */
  protected get coreState(): Readonly<StoreState<CoreState>>
  /**
   * @deprecated  use `this.state` Get a copy of the current state
   */
  protected getState(): TState
  /**
   * @deprecated  use `this.coreState` Get a copy of the current core state
   */
  protected getCoreState(): StoreState<CoreState>
  /**
   * Core Dispatch
   */
  protected dispatchCoreAction(action: CoreAction): StoreState<CoreState>
  /**
   * Dispatch an action to all plugins
   */
  protected dispatchToAllPlugins(action: TAction): StoreState<CoreState>
  /**
   * Dispatch an action
   */
  protected dispatch(action: TAction): TState
  /**
   * Dispatch an action with a cooldown to prevent rapid repeated calls
   * This executes immediately if cooldown has expired, then blocks subsequent calls
   * @param action The action to dispatch
   * @param cooldownTime Time in ms for cooldown (default: 100ms)
   * @returns boolean indicating whether the action was dispatched or blocked
   */
  protected cooldownDispatch(action: TAction, cooldownTime?: number): boolean
  /**
   * Dispatch an action with true debouncing - waits for the delay after the last call
   * Each new call resets the timer. Action only executes after no calls for the specified time.
   * @param action The action to dispatch
   * @param debounceTime Time in ms to wait after the last call
   */
  protected debouncedDispatch(action: TAction, debounceTime?: number): void
  /**
   * Cancel a pending debounced action
   * @param actionType The action type to cancel
   */
  protected cancelDebouncedDispatch(actionType: string): void
  /**
   * Subscribe to state changes
   */
  protected subscribe(listener: (action: TAction, state: TState) => void): () => void
  /**
   * Subscribe to core store changes
   */
  protected subscribeToCoreStore(
    listener: (action: Action, state: StoreState<CoreState>) => void,
  ): () => void
  /**
   * Called when the plugin store state is updated
   * @param oldState Previous state
   * @param newState New state
   */
  protected onStoreUpdated(oldState: TState, newState: TState): void
  /**
   * Called when the core store state is updated
   * @param oldState Previous state
   * @param newState New state
   */
  protected onCoreStoreUpdated(
    oldState: StoreState<CoreState>,
    newState: StoreState<CoreState>,
  ): void
  /**
   * Cleanup method to be called when plugin is being destroyed
   */
  destroy(): void
  /**
   * Returns a promise that resolves when the plugin is ready
   */
  ready(): Promise<void>
  /**
   * Mark the plugin as ready
   */
  protected markReady(): void
  /**
   * Reset the ready state (useful for plugins that need to reinitialize)
   */
  protected resetReady(): void
}
