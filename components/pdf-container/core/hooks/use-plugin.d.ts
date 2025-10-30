import { BasePlugin } from "../types"
type PluginState<T extends BasePlugin> = {
  plugin: T | null
  isLoading: boolean
  ready: Promise<void>
}
/**
 * Hook to access a plugin.
 * @param pluginId The ID of the plugin to access
 * @returns The plugin or null during initialization
 * @example
 * // Get zoom plugin
 * const zoom = usePlugin<ZoomPlugin>(ZoomPlugin.id);
 */
export declare function usePlugin<T extends BasePlugin>(pluginId: T["id"]): PluginState<T>
export {}
