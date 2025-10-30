import { Action } from "../store"
import { IPlugin, PluginBatchRegistration, PluginPackage } from "../types"

/**
 * Helper function to create a properly typed plugin registration
 */
export declare function createPluginRegistration<
  T extends IPlugin<TConfig>,
  TConfig,
  TState,
  TAction extends Action,
>(
  pluginPackage: PluginPackage<T, TConfig, TState, TAction>,
  config?: Partial<TConfig>,
): PluginBatchRegistration<T, TConfig, any, any>
