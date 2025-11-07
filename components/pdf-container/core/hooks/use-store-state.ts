import { useEffect, useState } from "react"
import { CoreState, StoreState } from "../lib"
import { useRegistry } from "./use-registry"

/**
 * Hook that provides access to the current global store state
 * and re-renders the component when the state changes
 */
export function useStoreState<T = CoreState>(): StoreState<T> | null {
  const { registry } = useRegistry()
  const [state, setState] = useState<StoreState<T> | null>(null)

  useEffect(() => {
    if (!registry) return

    // Get initial state
    setState(registry.getStore().getState() as StoreState<T>)

    // Subscribe to store changes
    const unsubscribe = registry.getStore().subscribe((_action, newState) => {
      setState(newState as StoreState<T>)
    })

    return () => unsubscribe()
  }, [registry])

  return state
}
