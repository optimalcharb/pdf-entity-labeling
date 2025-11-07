import type { BasePlugin } from "../lib"
import { usePlugin } from "./use-plugin"

type CapabilityState<T extends BasePlugin> = {
  provides: ReturnType<NonNullable<T["provides"]>> | null
  isLoading: boolean
  ready: Promise<void>
}

/**
 * Hook to access a plugin's capability.
 * @param pluginId The ID of the plugin to access
 * @returns The capability provided by the plugin or null during initialization
 * @example
 * // Get zoom capability
 * const zoom = useCapability<ZoomPlugin>(ZoomPlugin.id);
 */
export function useCapability<T extends BasePlugin>(pluginId: T["id"]): CapabilityState<T> {
  const { plugin, isLoading, ready } = usePlugin<T>(pluginId)

  if (!plugin) {
    return {
      provides: null,
      isLoading,
      ready,
    }
  }

  if (!plugin.provides) {
    throw new Error(`Plugin ${pluginId} does not provide a capability`)
  }

  return {
    provides: plugin.provides() as ReturnType<NonNullable<T["provides"]>>,
    isLoading,
    ready,
  }
}
