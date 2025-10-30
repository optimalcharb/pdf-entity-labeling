import { PluginRegistry } from "./plugin-registry"
import { Logger, Rotation } from "../models"
import { Action, CoreState, Reducer } from "../store"
export interface IPlugin<TConfig = unknown> {
  id: string
  initialize?(config: TConfig): Promise<void>
  destroy?(): Promise<void> | void
  provides?(): any
  postInitialize?(): Promise<void>
  ready?(): Promise<void>
}
export interface BasePluginConfig {
  enabled?: boolean
}
export interface PluginRegistryConfig {
  rotation?: Rotation
  scale?: number
  logger?: Logger
}
export interface PluginManifest<TConfig = unknown> {
  id: string
  name: string
  version: string
  provides: string[]
  requires: string[]
  optional: string[]
  defaultConfig: TConfig
  metadata?: {
    description?: string
    author?: string
    homepage?: string
    [key: string]: unknown
  }
}
export interface PluginPackage<
  T extends IPlugin<TConfig>,
  TConfig = unknown,
  TState = unknown,
  TAction extends Action = Action,
> {
  manifest: PluginManifest<TConfig>
  create(registry: PluginRegistry, config: TConfig): T
  reducer: Reducer<TState, TAction>
  initialState: TState | ((coreState: CoreState, config: TConfig) => TState)
}
export type Component = any
export type StandaloneComponent = Component
export type ContainerComponent = Component
export type AutoMountElement =
  | {
      component: StandaloneComponent
      type: "utility"
    }
  | {
      component: ContainerComponent
      type: "wrapper"
    }
export type WithAutoMount<T extends PluginPackage<any, any, any, any>> = T & {
  /**
   * Returns an array of components/elements with their mount type.
   * - 'utility': Mounted as hidden DOM elements (file pickers, download anchors)
   * - 'wrapper': Wraps the viewer content (fullscreen providers, theme providers)
   */
  autoMountElements: () => AutoMountElement[]
}
export declare function hasAutoMountElements<T extends PluginPackage<any, any, any, any>>(
  pkg: T,
): pkg is WithAutoMount<T>
export type PluginStatus = "registered" | "active" | "error" | "disabled" | "unregistered"
export interface PluginBatchRegistration<
  T extends IPlugin<TConfig>,
  TConfig = unknown,
  TState = unknown,
  TAction extends Action = Action,
> {
  package: PluginPackage<T, TConfig, TState, TAction>
  config?: Partial<TConfig>
}
export interface GlobalStoreState<TPlugins extends Record<string, any> = object> {
  core: CoreState
  plugins: TPlugins
}
