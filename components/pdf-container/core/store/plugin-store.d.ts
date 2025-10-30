import { Store } from "./store"
import { Action } from "./types"
/**
 * A type-safe store handle for plugins, providing access to plugin-specific state and actions.
 */
export declare class PluginStore<PluginState, PluginAction extends Action> {
  private store
  private pluginId
  /**
   * Initializes the PluginStore with the main store and plugin ID.
   * @param store The main store instance.
   * @param pluginId The unique identifier for the plugin.
   */
  constructor(store: Store<any, any>, pluginId: string)
  /**
   * Gets the current state of the plugin.
   * @returns The plugin's state.
   */
  getState(): PluginState
  /**
   * Dispatches an action for the plugin and returns the *new* global state.
   * If you only need the plugin’s updated state, call `getState()` afterward.
   * @param action The action to dispatch.
   * @returns The updated global store state (after plugin reducer).
   */
  dispatch(action: PluginAction): PluginState
  /**
   * Subscribes to state changes only for this specific plugin.
   * You now receive (action, newPluginState, oldPluginState) in the callback.
   *
   * @param listener The callback to invoke when plugin state changes.
   * @returns A function to unsubscribe the listener.
   */
  subscribeToState(
    listener: (action: PluginAction, newState: PluginState, oldState: PluginState) => void,
  ): () => void
  /**
   * Subscribes to a specific action type for the plugin.
   * This still uses the main store's `onAction`, so you get the *global*
   * old/new store states there. If you specifically want old/new plugin state,
   * use `subscribeToState` instead.
   *
   * @param type The action type to listen for.
   * @param handler The callback to invoke when the action occurs.
   * @returns A function to unsubscribe the handler.
   */
  onAction<T extends PluginAction["type"]>(
    type: T,
    handler: (
      action: Extract<
        PluginAction,
        {
          type: T
        }
      >,
      state: PluginState,
      oldState: PluginState,
    ) => void,
  ): () => void
}
