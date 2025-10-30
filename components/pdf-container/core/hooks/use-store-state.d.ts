import { CoreState, StoreState } from "../store"
/**
 * Hook that provides access to the current global store state
 * and re-renders the component when the state changes
 */
export declare function useStoreState<T = CoreState>(): StoreState<T> | null
