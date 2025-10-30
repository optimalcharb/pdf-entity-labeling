import { Action, PluginListener, Reducer, StoreListener, StoreState } from "./types"
import { PluginStore } from "./plugin-store"
/**
 * A generic, type-safe store class managing core and plugin states, reducers, and subscriptions.
 * @template CoreState The type of the core state.
 * @template CoreAction The type of actions handled by core reducers (extends Action).
 */
export declare class Store<CoreState, CoreAction extends Action = Action> {
  initialCoreState: CoreState
  private state
  private coreReducer
  private pluginReducers
  private listeners
  private pluginListeners
  /**
   * Initializes the store with the provided core state.
   * @param reducer          The core reducer function
   * @param initialCoreState The initial core state
   */
  constructor(reducer: Reducer<CoreState, CoreAction>, initialCoreState: CoreState)
  /**
   * Adds a reducer for a plugin-specific state.
   * @param pluginId The unique identifier for the plugin.
   * @param reducer The reducer function for the plugin state.
   * @param initialState The initial state for the plugin.
   */
  addPluginReducer<PluginState>(
    pluginId: string,
    reducer: Reducer<PluginState, Action>,
    initialState: PluginState,
  ): void
  /**
   * Dispatches an action *only* to the core reducer.
   * Notifies the global store listeners with (action, newState, oldState).
   *
   * @param action The action to dispatch, typed as CoreAction
   * @returns The updated *global* store state
   */
  dispatchToCore(action: CoreAction): StoreState<CoreState>
  /**
   * Dispatches an action *only* to a specific plugin.
   * Optionally notifies global store listeners if `notifyGlobal` is true.
   * Always notifies plugin-specific listeners with (action, newPluginState, oldPluginState).
   *
   * @param pluginId   The plugin identifier
   * @param action     The plugin action to dispatch
   * @param notifyGlobal Whether to also notify global store listeners
   * @returns The updated *global* store state
   */
  dispatchToPlugin<PluginAction extends Action>(
    pluginId: string,
    action: PluginAction,
    notifyGlobal?: boolean,
  ): any
  /**
   * Dispatches an action to update the state using:
   * - the core reducer (if it's a CoreAction)
   * - *all* plugin reducers (regardless of action type), with no global notify for each plugin
   *
   * Returns the new *global* store state after all reducers have processed the action.
   *
   * @param action The action to dispatch (can be CoreAction or any Action).
   */
  dispatch(action: CoreAction | Action): StoreState<CoreState>
  /**
   * Returns a shallow copy of the current state.
   * @returns The current store state.
   */
  getState(): StoreState<CoreState>
  /**
   * Subscribes a listener to *global* state changes.
   * The callback signature is now (action, newState, oldState).
   *
   * @param listener The callback to invoke on state changes
   * @returns A function to unsubscribe the listener
   */
  subscribe(listener: StoreListener<CoreState>): () => void
  /**
   * Subscribes a listener to *plugin-specific* state changes.
   * The callback signature is now (action, newPluginState, oldPluginState).
   *
   * @param pluginId The unique identifier for the plugin.
   * @param listener The callback to invoke on plugin state changes.
   * @returns A function to unsubscribe the listener.
   */
  subscribeToPlugin(pluginId: string, listener: PluginListener): () => void
  /**
   * Subscribes to a specific action type (only from the core's action union).
   * The callback signature is (action, newState, oldState).
   *
   * @param type The action type to listen for.
   * @param handler The callback to invoke when the action occurs.
   * @returns A function to unsubscribe the handler.
   */
  onAction<T extends CoreAction["type"]>(
    type: T,
    handler: (
      action: Extract<
        CoreAction,
        {
          type: T
        }
      >,
      state: StoreState<CoreState>,
      oldState: StoreState<CoreState>,
    ) => void,
  ): () => void
  /**
   * Gets a PluginStore handle for a specific plugin.
   * @param pluginId The unique identifier for the plugin.
   * @returns A PluginStore instance for the plugin.
   */
  getPluginStore<PluginState, PluginAction extends Action>(
    pluginId: string,
  ): PluginStore<PluginState, PluginAction>
  /**
   * Helper method to check if an action is a CoreAction.
   * Adjust if you have a more refined way to differentiate CoreAction vs. any other Action.
   */
  isCoreAction(action: Action): action is CoreAction
  /**
   * Destroy the store: drop every listener and plugin reducer
   */
  destroy(): void
}
