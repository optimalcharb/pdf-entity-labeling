/** Represents an action with a type and optional payload */
export interface Action {
  type: string
  payload?: any
}
/** A reducer function that updates a specific state based on an action */
export type Reducer<State, Action> = (state: State, action: Action) => State
/**
 * Represents the overall store state, with a typed core and plugin states
 */
export interface StoreState<CoreState> {
  core: CoreState
  plugins: Record<string, any>
}
/**
 * The signature of a main-store listener. You now receive:
 * - `action`    => The action that was dispatched
 * - `newState` => The store state *after* the update
 * - `oldState` => The store state *before* the update
 */
export type StoreListener<CoreState> = (
  action: Action,
  newState: StoreState<CoreState>,
  oldState: StoreState<CoreState>,
) => void
/**
 * The signature of a plugin-store listener. You now receive:
 * - `action`         => The action that was dispatched
 * - `newPluginState` => The plugin state *after* the update
 * - `oldPluginState` => The plugin state *before* the update
 */
export type PluginListener = (action: Action, newPluginState: any, oldPluginState: any) => void
