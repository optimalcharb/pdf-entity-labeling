import { Action } from '../store';
import { IPlugin, PluginBatchRegistration, PluginPackage } from '../types/plugin';

/**
 * Helper function to create a properly typed plugin registration
 */
export function createPluginRegistration<
  T extends IPlugin<TConfig>,
  TConfig,
  TState,
  TAction extends Action,
>(
  pluginPackage: PluginPackage<T, TConfig, TState, TAction>,
  config?: Partial<TConfig>,
): PluginBatchRegistration<T, TConfig, any, any> {
  return {
    package: pluginPackage,
    config,
  };
}
