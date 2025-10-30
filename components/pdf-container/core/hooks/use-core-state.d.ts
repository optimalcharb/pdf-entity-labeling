import { CoreState } from "../store"
/**
 * Hook that provides access to the current core state
 * and re-renders the component only when the core state changes
 */
export declare function useCoreState(): CoreState | null
