import {
  ContainerComponent,
  IPlugin,
  PluginPackage,
  StandaloneComponent,
  WithAutoMount,
} from "./plugin"
import { Action } from "../store"
export declare class PluginPackageBuilder<
  T extends IPlugin<TConfig>,
  TConfig = unknown,
  TState = unknown,
  TAction extends Action = Action,
> {
  private package
  private autoMountElements
  constructor(basePackage: PluginPackage<T, TConfig, TState, TAction>)
  addUtility(component: StandaloneComponent): this
  addWrapper(component: ContainerComponent): this
  build(): WithAutoMount<PluginPackage<T, TConfig, TState, TAction>>
}
export declare function createPluginPackage<
  T extends IPlugin<TConfig>,
  TConfig = unknown,
  TState = unknown,
  TAction extends Action = Action,
>(
  basePackage: PluginPackage<T, TConfig, TState, TAction>,
): PluginPackageBuilder<T, TConfig, TState, TAction>
