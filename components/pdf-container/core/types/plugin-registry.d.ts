import {
  IPlugin,
  PluginBatchRegistration,
  PluginPackage,
  PluginRegistryConfig,
  PluginStatus,
} from "./plugin"
import { Logger, PdfEngine } from "../models"
import { Action, CoreAction, CoreState, Store } from "../store"
export declare class PluginRegistry {
  private plugins
  private manifests
  private capabilities
  private status
  private resolver
  private configurations
  private engine
  private engineInitialized
  private store
  private initPromise
  private logger
  private pendingRegistrations
  private processingRegistrations
  private initialized
  private isInitializing
  private initialCoreState
  private pluginsReadyPromise
  private destroyed
  constructor(engine: PdfEngine, config?: PluginRegistryConfig)
  /**
   * Get the logger instance
   */
  getLogger(): Logger
  /**
   * Ensure engine is initialized before proceeding
   */
  private ensureEngineInitialized
  /**
   * Register a plugin without initializing it
   */
  registerPlugin<
    TPlugin extends IPlugin<TConfig>,
    TConfig = unknown,
    TState = unknown,
    TAction extends Action = Action,
  >(
    pluginPackage: PluginPackage<TPlugin, TConfig, TState, TAction>,
    config?: Partial<TConfig>,
  ): void
  /**
   * Get the central store instance
   */
  getStore(): Store<CoreState, CoreAction>
  /**
   * Get the engine instance
   */
  getEngine(): PdfEngine
  /**
   * Get a promise that resolves when all plugins are ready
   */
  pluginsReady(): Promise<void>
  /**
   * INITIALISE THE REGISTRY – runs once no-matter-how-many calls   *
   */
  initialize(): Promise<void>
  /**
   * Initialize a single plugin with all necessary checks
   */
  private initializePlugin
  getPluginConfig<TConfig>(pluginId: string): TConfig
  private validateConfig
  updatePluginConfig<TConfig>(pluginId: string, config: Partial<TConfig>): Promise<void>
  /**
   * Register multiple plugins at once
   */
  registerPluginBatch(registrations: PluginBatchRegistration<IPlugin<any>, any, any, any>[]): void
  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): Promise<void>
  /**
   * Get a plugin instance
   * @param pluginId The ID of the plugin to get
   * @returns The plugin instance or null if not found
   */
  getPlugin<T extends IPlugin>(pluginId: string): T | null
  /**
   * Get a plugin that provides a specific capability
   * @param capability The capability to get a provider for
   * @returns The plugin providing the capability or null if not found
   */
  getCapabilityProvider(capability: string): IPlugin | null
  /**
   * Check if a capability is available
   */
  hasCapability(capability: string): boolean
  /**
   * Get all registered plugins
   */
  getAllPlugins(): IPlugin[]
  /**
   * Get plugin status
   */
  getPluginStatus(pluginId: string): PluginStatus
  /**
   * Validate plugin object
   */
  private validatePlugin
  /**
   * Validate plugin manifest
   */
  private validateManifest
  isDestroyed(): boolean
  /**
   * DESTROY EVERYTHING – waits for any ongoing initialise(), once  *
   */
  destroy(): Promise<void>
}
