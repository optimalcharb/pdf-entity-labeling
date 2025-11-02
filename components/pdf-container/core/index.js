import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState } from "react"
import { jsx, jsxs } from "react/jsx-runtime"

// import/export from side files
import { DependencyResolver } from "./dependency-resolver.ts"
import { arePropsEqual } from "./math.ts"

export class PluginStore {
  /**
   * Initializes the PluginStore with the main store and plugin ID.
   * @param store The main store instance.
   * @param pluginId The unique identifier for the plugin.
   */
  constructor(store, pluginId) {
    this.store = store
    this.pluginId = pluginId
  }
  /**
   * Gets the current state of the plugin.
   * @returns The plugin's state.
   */
  getState() {
    return this.store.getState().plugins[this.pluginId]
  }
  /**
   * Dispatches an action for the plugin and returns the *new* global state.
   * If you only need the plugin's updated state, call `getState()` afterward.
   * @param action The action to dispatch.
   * @returns The updated global store state (after plugin reducer).
   */
  dispatch(action) {
    return this.store.dispatchToPlugin(this.pluginId, action)
  }
  /**
   * Subscribes to state changes only for this specific plugin.
   * You now receive (action, newPluginState, oldPluginState) in the callback.
   *
   * @param listener The callback to invoke when plugin state changes.
   * @returns A function to unsubscribe the listener.
   */
  subscribeToState(listener) {
    return this.store.subscribeToPlugin(this.pluginId, (action, newPluginState, oldPluginState) => {
      listener(action, newPluginState, oldPluginState)
    })
  }
  /**
   * Subscribes to a specific action type for the plugin.
   * This still uses the main store's `onAction`, so you get the *global*
   * old/new store states there. If you specifically want old/new plugin state,
   * use `subscribeToState` instead.
   *
   * @param type The action type to listen for.
   * @param handler The callback to invoke when the action occurs.
   * @returns A function to unsubscribe the handler.
   */
  onAction(type, handler) {
    return this.store.onAction(type, (action, state, oldState) => {
      handler(action, state.plugins[this.pluginId], oldState.plugins[this.pluginId])
    })
  }
}
export const LOAD_DOCUMENT = "LOAD_DOCUMENT"
export const REFRESH_DOCUMENT = "REFRESH_DOCUMENT"
export const REFRESH_PAGES = "REFRESH_PAGES"
export const SET_DOCUMENT = "SET_DOCUMENT"
export const SET_DOCUMENT_ERROR = "SET_DOCUMENT_ERROR"
export const SET_SCALE = "SET_SCALE"
export const SET_ROTATION = "SET_ROTATION"
export const SET_PAGES = "SET_PAGES"
export const CORE_ACTION_TYPES = [
  LOAD_DOCUMENT,
  REFRESH_DOCUMENT,
  SET_DOCUMENT,
  SET_DOCUMENT_ERROR,
  SET_SCALE,
  SET_ROTATION,
  SET_PAGES,
]
export const loadDocument = () => ({ type: LOAD_DOCUMENT })
export const refreshDocument = (document) => ({
  type: REFRESH_DOCUMENT,
  payload: document,
})
export const refreshPages = (pages) => ({
  type: REFRESH_PAGES,
  payload: pages,
})
export const setDocument = (document) => ({
  type: SET_DOCUMENT,
  payload: document,
})
export const setDocumentError = (error) => ({
  type: SET_DOCUMENT_ERROR,
  payload: error,
})
export const setScale = (scale) => ({ type: SET_SCALE, payload: scale })
export const setRotation = (rotation) => ({
  type: SET_ROTATION,
  payload: rotation,
})
export const setPages = (pages) => ({
  type: SET_PAGES,
  payload: pages,
})
export class Store {
  /**
   * Initializes the store with the provided core state.
   * @param reducer          The core reducer function
   * @param initialCoreState The initial core state
   */
  constructor(reducer, initialCoreState2) {
    this.initialCoreState = initialCoreState2
    this.pluginReducers = {}
    this.listeners = []
    this.pluginListeners = {}
    this.state = { core: initialCoreState2, plugins: {} }
    this.coreReducer = reducer
  }
  /**
   * Adds a reducer for a plugin-specific state.
   * @param pluginId The unique identifier for the plugin.
   * @param reducer The reducer function for the plugin state.
   * @param initialState The initial state for the plugin.
   */
  addPluginReducer(pluginId, reducer, initialState) {
    this.state.plugins[pluginId] = initialState
    this.pluginReducers[pluginId] = reducer
  }
  /**
   * Dispatches an action *only* to the core reducer.
   * Notifies the global store listeners with (action, newState, oldState).
   *
   * @param action The action to dispatch, typed as CoreAction
   * @returns The updated *global* store state
   */
  dispatchToCore(action) {
    if (!this.coreReducer) {
      return this.getState()
    }
    const oldState = this.getState()
    this.state.core = this.coreReducer(this.state.core, action)
    const newState = this.getState()
    this.listeners.forEach((listener) => listener(action, newState, oldState))
    return newState
  }
  /**
   * Dispatches an action *only* to a specific plugin.
   * Optionally notifies global store listeners if `notifyGlobal` is true.
   * Always notifies plugin-specific listeners with (action, newPluginState, oldPluginState).
   *
   * @param pluginId   The plugin identifier
   * @param action     The plugin action to dispatch
   * @param notifyGlobal Whether to also notify global store listeners
   * @returns The updated *global* store state
   */
  dispatchToPlugin(pluginId, action, notifyGlobal = true) {
    const oldGlobalState = this.getState()
    const reducer = this.pluginReducers[pluginId]
    if (!reducer) {
      return oldGlobalState
    }
    const oldPluginState = oldGlobalState.plugins[pluginId]
    const newPluginState = reducer(oldPluginState, action)
    this.state.plugins[pluginId] = newPluginState
    const newGlobalState = this.getState()
    if (notifyGlobal) {
      this.listeners.forEach((listener) => listener(action, newGlobalState, oldGlobalState))
    }
    if (this.pluginListeners[pluginId]) {
      this.pluginListeners[pluginId].forEach((listener) => {
        listener(action, newPluginState, oldPluginState)
      })
    }
    return newPluginState
  }
  /**
   * Dispatches an action to update the state using:
   * - the core reducer (if it's a CoreAction)
   * - *all* plugin reducers (regardless of action type), with no global notify for each plugin
   *
   * Returns the new *global* store state after all reducers have processed the action.
   *
   * @param action The action to dispatch (can be CoreAction or any Action).
   */
  dispatch(action) {
    const oldState = this.getState()
    if (this.isCoreAction(action)) {
      this.state.core = this.coreReducer(this.state.core, action)
    }
    for (const pluginId in this.pluginReducers) {
      const reducer = this.pluginReducers[pluginId]
      const oldPluginState = oldState.plugins[pluginId]
      if (reducer) {
        this.state.plugins[pluginId] = reducer(oldPluginState, action)
      }
    }
    const newState = this.getState()
    this.listeners.forEach((listener) => listener(action, newState, oldState))
    return newState
  }
  /**
   * Returns a shallow copy of the current state.
   * @returns The current store state.
   */
  getState() {
    return {
      core: { ...this.state.core },
      plugins: { ...this.state.plugins },
    }
  }
  /**
   * Subscribes a listener to *global* state changes.
   * The callback signature is now (action, newState, oldState).
   *
   * @param listener The callback to invoke on state changes
   * @returns A function to unsubscribe the listener
   */
  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }
  /**
   * Subscribes a listener to *plugin-specific* state changes.
   * The callback signature is now (action, newPluginState, oldPluginState).
   *
   * @param pluginId The unique identifier for the plugin.
   * @param listener The callback to invoke on plugin state changes.
   * @returns A function to unsubscribe the listener.
   */
  subscribeToPlugin(pluginId, listener) {
    if (!(pluginId in this.state.plugins)) {
      throw new Error(
        `Plugin state not found for plugin "${pluginId}". Did you forget to call addPluginReducer?`,
      )
    }
    if (!this.pluginListeners[pluginId]) {
      this.pluginListeners[pluginId] = []
    }
    this.pluginListeners[pluginId].push(listener)
    return () => {
      this.pluginListeners[pluginId] = this.pluginListeners[pluginId].filter((l) => l !== listener)
      if (this.pluginListeners[pluginId].length === 0) {
        delete this.pluginListeners[pluginId]
      }
    }
  }
  /**
   * Subscribes to a specific action type (only from the core's action union).
   * The callback signature is (action, newState, oldState).
   *
   * @param type The action type to listen for.
   * @param handler The callback to invoke when the action occurs.
   * @returns A function to unsubscribe the handler.
   */
  onAction(type, handler) {
    return this.subscribe((action, newState, oldState) => {
      if (action.type === type) {
        handler(action, newState, oldState)
      }
    })
  }
  /**
   * Gets a PluginStore handle for a specific plugin.
   * @param pluginId The unique identifier for the plugin.
   * @returns A PluginStore instance for the plugin.
   */
  getPluginStore(pluginId) {
    if (!(pluginId in this.state.plugins)) {
      throw new Error(
        `Plugin state not found for plugin "${pluginId}". Did you forget to call addPluginReducer?`,
      )
    }
    return new PluginStore(this, pluginId)
  }
  /**
   * Helper method to check if an action is a CoreAction.
   * Adjust if you have a more refined way to differentiate CoreAction vs. any other Action.
   */
  isCoreAction(action) {
    return CORE_ACTION_TYPES.includes(action.type)
  }
  /**
   * Destroy the store: drop every listener and plugin reducer
   */
  destroy() {
    var _a, _b
    this.listeners.length = 0
    for (const id in this.pluginListeners) {
      this.pluginListeners[id]?.splice(0)
    }
    this.pluginListeners = {}
    this.pluginReducers = {}
    this.state.plugins = {}
    this.state.core = { ...this.initialCoreState }
  }
}
const initialCoreState = (config) => ({
  scale: (config == null ? void 0 : config.scale) ?? 1,
  rotation: (config == null ? void 0 : config.rotation) ?? Rotation.Degree0,
  document: null,
  pages: [],
  loading: false,
  error: null,
})
export const getPagesWithRotatedSize = (state) => {
  return state.pages.map((page) =>
    page.map((p) => ({
      ...p,
      rotatedSize: transformSize(p.size, state.rotation, 1),
    })),
  )
}
const coreReducer = (state, action) => {
  switch (action.type) {
    case LOAD_DOCUMENT:
      return {
        ...state,
        loading: true,
        error: null,
      }
    case SET_DOCUMENT:
      return {
        ...state,
        document: action.payload,
        pages: action.payload.pages.map((page) => [page]),
        loading: false,
        error: null,
      }
    case REFRESH_DOCUMENT:
      return {
        ...state,
        document: action.payload,
        pages: action.payload.pages.map((page) => [page]),
        loading: false,
        error: null,
      }
    case SET_ROTATION:
      return {
        ...state,
        rotation: action.payload,
      }
    case SET_PAGES:
      return {
        ...state,
        pages: action.payload,
      }
    case SET_DOCUMENT_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      }
    case SET_SCALE:
      return {
        ...state,
        scale: action.payload,
      }
    default:
      return state
  }
}
export class PluginRegistry {
  constructor(engine, config) {
    this.plugins = /* @__PURE__ */ new Map()
    this.manifests = /* @__PURE__ */ new Map()
    this.capabilities = /* @__PURE__ */ new Map()
    this.status = /* @__PURE__ */ new Map()
    this.configurations = /* @__PURE__ */ new Map()
    this.engineInitialized = false
    this.initPromise = null
    this.pendingRegistrations = []
    this.processingRegistrations = []
    this.initialized = false
    this.isInitializing = false
    this.pluginsReadyPromise = null
    this.destroyed = false
    this.resolver = new DependencyResolver()
    this.engine = engine
    this.initialCoreState = initialCoreState(config)
    this.store = new Store(coreReducer, this.initialCoreState)
    this.logger = (config == null ? void 0 : config.logger) ?? new NoopLogger()
  }
  /**
   * Get the logger instance
   */
  getLogger() {
    return this.logger
  }
  /**
   * Ensure engine is initialized before proceeding
   */
  async ensureEngineInitialized() {
    if (this.engineInitialized) {
      return
    }
    if (this.engine.initialize) {
      const task = this.engine.initialize()
      await task.toPromise()
      this.engineInitialized = true
    } else {
      this.engineInitialized = true
    }
  }
  /**
   * Register a plugin without initializing it
   */
  registerPlugin(pluginPackage, config) {
    if (this.initialized && !this.isInitializing) {
      throw new PluginRegistrationError("Cannot register plugins after initialization")
    }
    this.validateManifest(pluginPackage.manifest)
    this.store.addPluginReducer(
      pluginPackage.manifest.id,
      // We need one type assertion here since we can't fully reconcile TAction with Action
      // due to TypeScript's type system limitations with generic variance
      pluginPackage.reducer,
      "function" === typeof pluginPackage.initialState
        ? pluginPackage.initialState(this.initialCoreState, {
            ...pluginPackage.manifest.defaultConfig,
            ...config,
          })
        : pluginPackage.initialState,
    )
    this.pendingRegistrations.push({
      package: pluginPackage,
      config,
    })
  }
  /**
   * Get the central store instance
   */
  getStore() {
    return this.store
  }
  /**
   * Get the engine instance
   */
  getEngine() {
    return this.engine
  }
  /**
   * Get a promise that resolves when all plugins are ready
   */
  pluginsReady() {
    if (this.pluginsReadyPromise) {
      return this.pluginsReadyPromise
    }
    this.pluginsReadyPromise = (async () => {
      if (!this.initialized) {
        await this.initialize()
      }
      const readyPromises = Array.from(this.plugins.values()).map((p) =>
        typeof p.ready === "function" ? p.ready() : Promise.resolve(),
      )
      await Promise.all(readyPromises)
    })()
    return this.pluginsReadyPromise
  }
  /**
   * INITIALISE THE REGISTRY – runs once no-matter-how-many calls   *
   */
  async initialize() {
    if (this.destroyed) {
      throw new PluginRegistrationError("Registry has been destroyed")
    }
    if (this.initPromise) {
      return this.initPromise
    }
    this.initPromise = (async () => {
      var _a
      if (this.initialized) {
        throw new PluginRegistrationError("Registry is already initialized")
      }
      this.isInitializing = true
      try {
        await this.ensureEngineInitialized()
        if (this.destroyed) {
          return
        }
        while (this.pendingRegistrations.length > 0) {
          if (this.destroyed) {
            return
          }
          this.processingRegistrations = [...this.pendingRegistrations]
          this.pendingRegistrations = []
          for (const reg of this.processingRegistrations) {
            const dependsOn = /* @__PURE__ */ new Set()
            const allDeps = [...reg.package.manifest.requires, ...reg.package.manifest.optional]
            for (const cap of allDeps) {
              const provider = this.processingRegistrations.find((r) =>
                r.package.manifest.provides.includes(cap),
              )
              if (provider) dependsOn.add(provider.package.manifest.id)
            }
            this.resolver.addNode(reg.package.manifest.id, [...dependsOn])
          }
          const loadOrder = this.resolver.resolveLoadOrder()
          for (const id of loadOrder) {
            const reg = this.processingRegistrations.find((r) => r.package.manifest.id === id)
            await this.initializePlugin(reg.package.manifest, reg.package.create, reg.config)
          }
          this.processingRegistrations = []
          this.resolver = new DependencyResolver()
        }
        for (const plugin of this.plugins.values()) {
          await plugin.postInitialize?.().catch((e) => {
            console.error(`Error in postInitialize for plugin ${plugin.id}`, e)
            this.status.set(plugin.id, "error")
          })
        }
        this.initialized = true
      } catch (err) {
        if (err instanceof Error) {
          throw new CircularDependencyError(`Failed to resolve plugin dependencies: ${err.message}`)
        }
        throw err
      } finally {
        this.isInitializing = false
      }
    })()
    return this.initPromise
  }
  /**
   * Initialize a single plugin with all necessary checks
   */
  async initializePlugin(manifest, packageCreator, config) {
    const finalConfig = {
      ...manifest.defaultConfig,
      ...config,
    }
    this.validateConfig(manifest.id, finalConfig, manifest.defaultConfig)
    const plugin = packageCreator(this, finalConfig)
    this.validatePlugin(plugin)
    for (const capability of manifest.requires) {
      if (!this.capabilities.has(capability)) {
        throw new PluginRegistrationError(
          `Missing required capability: ${capability} for plugin ${manifest.id}`,
        )
      }
    }
    for (const capability of manifest.optional) {
      if (this.capabilities.has(capability)) {
        this.logger.debug(
          "PluginRegistry",
          "OptionalCapability",
          `Optional capability ${capability} is available for plugin ${manifest.id}`,
        )
      }
    }
    this.logger.debug("PluginRegistry", "InitializePlugin", `Initializing plugin ${manifest.id}`, {
      provides: manifest.provides,
    })
    for (const capability of manifest.provides) {
      if (this.capabilities.has(capability)) {
        throw new PluginRegistrationError(
          `Capability ${capability} is already provided by plugin ${this.capabilities.get(capability)}`,
        )
      }
      this.capabilities.set(capability, manifest.id)
    }
    this.plugins.set(manifest.id, plugin)
    this.manifests.set(manifest.id, manifest)
    this.status.set(manifest.id, "registered")
    this.configurations.set(manifest.id, finalConfig)
    try {
      if (plugin.initialize) {
        await plugin.initialize(finalConfig)
      }
      this.status.set(manifest.id, "active")
      this.logger.info(
        "PluginRegistry",
        "PluginInitialized",
        `Plugin ${manifest.id} initialized successfully`,
      )
    } catch (error) {
      this.plugins.delete(manifest.id)
      this.manifests.delete(manifest.id)
      this.logger.error(
        "PluginRegistry",
        "InitializationFailed",
        `Plugin ${manifest.id} initialization failed`,
        {
          provides: manifest.provides,
          error,
        },
      )
      manifest.provides.forEach((cap) => this.capabilities.delete(cap))
      throw error
    }
  }
  getPluginConfig(pluginId) {
    const config = this.configurations.get(pluginId)
    if (!config) {
      throw new PluginNotFoundError(`Configuration for plugin ${pluginId} not found`)
    }
    return config
  }
  validateConfig(pluginId, config, defaultConfig) {
    const requiredKeys = Object.keys(defaultConfig)
    const missingKeys = requiredKeys.filter((key) => !config.hasOwnProperty(key))
    if (missingKeys.length > 0) {
      throw new PluginConfigurationError(
        `Missing required configuration keys for plugin ${pluginId}: ${missingKeys.join(", ")}`,
      )
    }
  }
  async updatePluginConfig(pluginId, config) {
    const plugin = this.getPlugin(pluginId)
    if (!plugin) {
      throw new PluginNotFoundError(`Plugin ${pluginId} not found`)
    }
    const manifest = this.manifests.get(pluginId)
    const currentConfig = this.configurations.get(pluginId)
    if (!manifest || !currentConfig) {
      throw new PluginNotFoundError(`Plugin ${pluginId} not found`)
    }
    const newConfig = {
      ...currentConfig,
      ...config,
    }
    this.validateConfig(pluginId, newConfig, manifest.defaultConfig)
    this.configurations.set(pluginId, newConfig)
    if (plugin.initialize) {
      await plugin.initialize(newConfig)
    }
  }
  /**
   * Register multiple plugins at once
   */
  registerPluginBatch(registrations) {
    for (const reg of registrations) {
      this.registerPlugin(reg.package, reg.config)
    }
  }
  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new PluginNotFoundError(`Plugin ${pluginId} is not registered`)
    }
    const manifest = this.manifests.get(pluginId)
    if (!manifest) {
      throw new PluginNotFoundError(`Manifest for plugin ${pluginId} not found`)
    }
    for (const [otherId, otherManifest] of this.manifests.entries()) {
      if (otherId === pluginId) continue
      const dependsOnThis = [...otherManifest.requires, ...otherManifest.optional].some((cap) =>
        manifest.provides.includes(cap),
      )
      if (dependsOnThis) {
        throw new PluginRegistrationError(
          `Cannot unregister plugin ${pluginId}: plugin ${otherId} depends on it`,
        )
      }
    }
    try {
      if (plugin.destroy) {
        await plugin.destroy()
      }
      for (const capability of manifest.provides) {
        this.capabilities.delete(capability)
      }
      this.plugins.delete(pluginId)
      this.manifests.delete(pluginId)
      this.status.delete(pluginId)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to unregister plugin ${pluginId}: ${error.message}`)
      }
      throw error
    }
  }
  /**
   * Get a plugin instance
   * @param pluginId The ID of the plugin to get
   * @returns The plugin instance or null if not found
   */
  getPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return null
    }
    return plugin
  }
  /**
   * Get a plugin that provides a specific capability
   * @param capability The capability to get a provider for
   * @returns The plugin providing the capability or null if not found
   */
  getCapabilityProvider(capability) {
    const pluginId = this.capabilities.get(capability)
    if (!pluginId) {
      return null
    }
    return this.getPlugin(pluginId)
  }
  /**
   * Check if a capability is available
   */
  hasCapability(capability) {
    return this.capabilities.has(capability)
  }
  /**
   * Get all registered plugins
   */
  getAllPlugins() {
    return Array.from(this.plugins.values())
  }
  /**
   * Get plugin status
   */
  getPluginStatus(pluginId) {
    const status = this.status.get(pluginId)
    if (!status) {
      throw new PluginNotFoundError(`Plugin ${pluginId} not found`)
    }
    return status
  }
  /**
   * Validate plugin object
   */
  validatePlugin(plugin) {
    if (!plugin.id) {
      throw new PluginRegistrationError("Plugin must have an id")
    }
  }
  /**
   * Validate plugin manifest
   */
  validateManifest(manifest) {
    if (!manifest.id) {
      throw new PluginRegistrationError("Manifest must have an id")
    }
    if (!manifest.name) {
      throw new PluginRegistrationError("Manifest must have a name")
    }
    if (!manifest.version) {
      throw new PluginRegistrationError("Manifest must have a version")
    }
    if (!Array.isArray(manifest.provides)) {
      throw new PluginRegistrationError("Manifest must have a provides array")
    }
    if (!Array.isArray(manifest.requires)) {
      throw new PluginRegistrationError("Manifest must have a requires array")
    }
    if (!Array.isArray(manifest.optional)) {
      throw new PluginRegistrationError("Manifest must have an optional array")
    }
  }
  isDestroyed() {
    return this.destroyed
  }
  /**
   * DESTROY EVERYTHING – waits for any ongoing initialise(), once  *
   */
  async destroy() {
    var _a
    if (this.destroyed) throw new PluginRegistrationError("Registry has already been destroyed")
    this.destroyed = true
    try {
      await this.initPromise
    } catch {}
    for (const plugin of Array.from(this.plugins.values()).reverse()) {
      await plugin.destroy?.()
    }
    this.store.destroy()
    this.plugins.clear()
    this.manifests.clear()
    this.capabilities.clear()
    this.status.clear()
    this.pendingRegistrations.length = 0
    this.processingRegistrations.length = 0
  }
}
export function createPluginRegistration(pluginPackage, config) {
  return {
    package: pluginPackage,
    config,
  }
}
export function hasAutoMountElements(pkg) {
  return "autoMountElements" in pkg && typeof pkg.autoMountElements === "function"
}
export class BasePlugin {
  constructor(id, registry) {
    this.id = id
    this.registry = registry
    this.cooldownActions = {}
    this.debouncedTimeouts = {}
    this.unsubscribeFromState = null
    this.unsubscribeFromCoreStore = null
    if (id !== this.constructor.id) {
      throw new Error(`Plugin ID mismatch: ${id} !== ${this.constructor.id}`)
    }
    this.engine = this.registry.getEngine()
    this.logger = this.registry.getLogger()
    this.coreStore = this.registry.getStore()
    this.pluginStore = this.coreStore.getPluginStore(this.id)
    this.unsubscribeFromState = this.pluginStore.subscribeToState((action, newState, oldState) => {
      this.onStoreUpdated(oldState, newState)
    })
    this.unsubscribeFromCoreStore = this.coreStore.subscribe((action, newState, oldState) => {
      this.onCoreStoreUpdated(oldState, newState)
    })
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })
    this.readyResolve()
  }
  provides() {
    if (!this._capability) {
      const cap = this.buildCapability()
      this._capability = Object.freeze(cap)
    }
    return this._capability
  }
  /**
   *  Get a copy of the current state
   */
  get state() {
    return this.pluginStore.getState()
  }
  /**
   *  Get a copy of the current core state
   */
  get coreState() {
    return this.coreStore.getState()
  }
  /**
   * @deprecated  use `this.state` Get a copy of the current state
   */
  getState() {
    return this.pluginStore.getState()
  }
  /**
   * @deprecated  use `this.coreState` Get a copy of the current core state
   */
  getCoreState() {
    return this.coreStore.getState()
  }
  /**
   * Core Dispatch
   */
  dispatchCoreAction(action) {
    return this.coreStore.dispatchToCore(action)
  }
  /**
   * Dispatch an action to all plugins
   */
  dispatchToAllPlugins(action) {
    return this.coreStore.dispatch(action)
  }
  /**
   * Dispatch an action
   */
  dispatch(action) {
    return this.pluginStore.dispatch(action)
  }
  /**
   * Dispatch an action with a cooldown to prevent rapid repeated calls
   * This executes immediately if cooldown has expired, then blocks subsequent calls
   * @param action The action to dispatch
   * @param cooldownTime Time in ms for cooldown (default: 100ms)
   * @returns boolean indicating whether the action was dispatched or blocked
   */
  cooldownDispatch(action, cooldownTime = 100) {
    const now = Date.now()
    const lastActionTime = this.cooldownActions[action.type] || 0
    if (now - lastActionTime >= cooldownTime) {
      this.cooldownActions[action.type] = now
      this.dispatch(action)
      return true
    }
    return false
  }
  /**
   * Dispatch an action with true debouncing - waits for the delay after the last call
   * Each new call resets the timer. Action only executes after no calls for the specified time.
   * @param action The action to dispatch
   * @param debounceTime Time in ms to wait after the last call
   */
  debouncedDispatch(action, debounceTime = 100) {
    const actionKey = action.type
    if (this.debouncedTimeouts[actionKey]) {
      clearTimeout(this.debouncedTimeouts[actionKey])
    }
    this.debouncedTimeouts[actionKey] = setTimeout(() => {
      this.dispatch(action)
      delete this.debouncedTimeouts[actionKey]
    }, debounceTime)
  }
  /**
   * Cancel a pending debounced action
   * @param actionType The action type to cancel
   */
  cancelDebouncedDispatch(actionType) {
    if (this.debouncedTimeouts[actionType]) {
      clearTimeout(this.debouncedTimeouts[actionType])
      delete this.debouncedTimeouts[actionType]
    }
  }
  /**
   * Subscribe to state changes
   */
  subscribe(listener) {
    return this.pluginStore.subscribeToState(listener)
  }
  /**
   * Subscribe to core store changes
   */
  subscribeToCoreStore(listener) {
    return this.coreStore.subscribe(listener)
  }
  /**
   * Called when the plugin store state is updated
   * @param oldState Previous state
   * @param newState New state
   */
  onStoreUpdated(oldState, newState) {}
  /**
   * Called when the core store state is updated
   * @param oldState Previous state
   * @param newState New state
   */
  onCoreStoreUpdated(oldState, newState) {}
  /**
   * Cleanup method to be called when plugin is being destroyed
   */
  destroy() {
    Object.values(this.debouncedTimeouts).forEach((timeout) => {
      clearTimeout(timeout)
    })
    this.debouncedTimeouts = {}
    if (this.unsubscribeFromState) {
      this.unsubscribeFromState()
      this.unsubscribeFromState = null
    }
    if (this.unsubscribeFromCoreStore) {
      this.unsubscribeFromCoreStore()
      this.unsubscribeFromCoreStore = null
    }
  }
  /**
   * Returns a promise that resolves when the plugin is ready
   */
  ready() {
    return this.readyPromise
  }
  /**
   * Mark the plugin as ready
   */
  markReady() {
    this.readyResolve()
  }
  /**
   * Reset the ready state (useful for plugins that need to reinitialize)
   */
  resetReady() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })
  }
}
export class PluginPackageBuilder {
  constructor(basePackage) {
    this.autoMountElements = []
    this.package = basePackage
  }
  addUtility(component) {
    this.autoMountElements.push({ component, type: "utility" })
    return this
  }
  addWrapper(component) {
    this.autoMountElements.push({ component, type: "wrapper" })
    return this
  }
  build() {
    return {
      ...this.package,
      autoMountElements: () => this.autoMountElements,
    }
  }
}
export function createPluginPackage(basePackage) {
  return new PluginPackageBuilder(basePackage)
}

export const PDFContext = createContext({
  registry: null,
  isInitializing: true,
  pluginsReady: false,
})

export function AutoMount({ plugins, children }) {
  const { utilities, wrappers } = useMemo(() => {
    const utilities2 = []
    const wrappers2 = []
    for (const reg of plugins) {
      const pkg = reg.package
      if (hasAutoMountElements(pkg)) {
        const elements = pkg.autoMountElements() || []
        for (const element of elements) {
          if (element.type === "utility") {
            utilities2.push(element.component)
          } else if (element.type === "wrapper") {
            wrappers2.push(element.component)
          }
        }
      }
    }
    return { utilities: utilities2, wrappers: wrappers2 }
  }, [plugins])
  const wrappedContent = wrappers.reduce(
    (content, Wrapper) => /* @__PURE__ */ jsx(Wrapper, { children: content }),
    children,
  )
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [
      wrappedContent,
      utilities.map((Utility, i) => /* @__PURE__ */ jsx(Utility, {}, `utility-${i}`)),
    ],
  })
}

export function EmbedPDF({
  engine,
  logger,
  onInitialized,
  plugins,
  children,
  autoMountDomElements = true,
}) {
  const [registry, setRegistry] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [pluginsReady, setPluginsReady] = useState(false)
  const initRef = useRef(onInitialized)
  useEffect(() => {
    initRef.current = onInitialized
  }, [onInitialized])
  useEffect(() => {
    const pdfViewer = new PluginRegistry(engine, { logger })
    pdfViewer.registerPluginBatch(plugins)
    const initialize = async () => {
      var _a
      await pdfViewer.initialize()
      if (pdfViewer.isDestroyed()) {
        return
      }
      await initRef.current?.(pdfViewer)
      if (pdfViewer.isDestroyed()) {
        return
      }
      pdfViewer.pluginsReady().then(() => {
        if (!pdfViewer.isDestroyed()) {
          setPluginsReady(true)
        }
      })
      setRegistry(pdfViewer)
      setIsInitializing(false)
    }
    initialize().catch(console.error)
    return () => {
      pdfViewer.destroy()
      setRegistry(null)
      setIsInitializing(true)
      setPluginsReady(false)
    }
  }, [engine, plugins])
  const content =
    typeof children === "function" ? children({ registry, isInitializing, pluginsReady }) : children
  return /* @__PURE__ */ jsx(PDFContext.Provider, {
    value: { registry, isInitializing, pluginsReady },
    children:
      pluginsReady && autoMountDomElements
        ? /* @__PURE__ */ jsx(AutoMount, { plugins, children: content })
        : content,
  })
}

export function useRegistry() {
  const contextValue = useContext(PDFContext)
  if (contextValue === void 0) {
    throw new Error("useCapability must be used within a PDFContext.Provider")
  }
  const { registry, isInitializing } = contextValue
  if (isInitializing) {
    return contextValue
  }
  if (registry === null) {
    throw new Error("PDF registry failed to initialize properly")
  }
  return contextValue
}
export function usePlugin(pluginId) {
  const { registry } = useRegistry()
  if (registry === null) {
    return {
      plugin: null,
      isLoading: true,
      ready: new Promise(() => {}),
    }
  }
  const plugin = registry.getPlugin(pluginId)
  if (!plugin) {
    throw new Error(`Plugin ${pluginId} not found`)
  }
  return {
    plugin,
    isLoading: false,
    ready: plugin.ready(),
  }
}
export function useCapability(pluginId) {
  const { plugin, isLoading, ready } = usePlugin(pluginId)
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
    provides: plugin.provides(),
    isLoading,
    ready,
  }
}
/** Charlie: might want to remove useStoreState */
export function useStoreState() {
  const { registry } = useRegistry()
  const [state, setState] = useState(null)
  useEffect(() => {
    if (!registry) return
    setState(registry.getStore().getState())
    const unsubscribe = registry.getStore().subscribe((_action, newState) => {
      setState(newState)
    })
    return () => unsubscribe()
  }, [registry])
  return state
}
export function useCoreState() {
  const { registry } = useRegistry()
  const [coreState, setCoreState] = useState(null)
  useEffect(() => {
    if (!registry) return
    const store = registry.getStore()
    setCoreState(store.getState().core)
    const unsubscribe = store.subscribe((action, newState, oldState) => {
      if (store.isCoreAction(action) && !arePropsEqual(newState.core, oldState.core)) {
        setCoreState(newState.core)
      }
    })
    return () => unsubscribe()
  }, [registry])
  return coreState
}

export function pdfColorToWebColor(c) {
  const clamp = (n) => Math.max(0, Math.min(255, n))
  const toHex = (n) => clamp(n).toString(16).padStart(2, "0")
  return `#${toHex(c.red)}${toHex(c.green)}${toHex(c.blue)}`
}
function webColorToPdfColor(color) {
  if (/^#?[0-9a-f]{3}$/i.test(color)) {
    color = color.replace(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i, "#$1$1$2$2$3$3").toLowerCase()
  }
  const [, r, g, b] =
    /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color) ??
    (() => {
      throw new Error(`Invalid hex colour: "${color}"`)
    })()
  return {
    red: parseInt(r, 16),
    green: parseInt(g, 16),
    blue: parseInt(b, 16),
  }
}
export function pdfAlphaToWebOpacity(alpha) {
  const clamp = (n) => Math.max(0, Math.min(255, n))
  return clamp(alpha) / 255
}
export function webOpacityToPdfAlpha(opacity) {
  const clamp = (n, hi = 255) => Math.max(0, Math.min(hi, n))
  return clamp(Math.round(opacity * 255))
}
export function extractPdfColor(c) {
  return { red: c.red, green: c.green, blue: c.blue }
}
export function extractWebOpacity(c) {
  return pdfAlphaToWebOpacity(c.alpha)
}
export function combinePdfColorWithAlpha(color, alpha) {
  return { ...color, alpha }
}
export function combineWebColorWithOpacity(color, opacity) {
  return { color, opacity }
}
export function pdfAlphaColorToWebAlphaColor(c) {
  const color = pdfColorToWebColor(extractPdfColor(c))
  const opacity = extractWebOpacity(c)
  return { color, opacity }
}
export function webAlphaColorToPdfAlphaColor({ color, opacity }) {
  const pdfColor = webColorToPdfColor(color)
  const alpha = webOpacityToPdfAlpha(opacity)
  return combinePdfColorWithAlpha(pdfColor, alpha)
}
export function pdfDateToDate(pdf) {
  if (!(pdf == null ? void 0 : pdf.startsWith("D:")) || pdf.length < 16) return
  const y = +pdf.slice(2, 6)
  const mo = +pdf.slice(6, 8) - 1
  const d = +pdf.slice(8, 10)
  const H = +pdf.slice(10, 12)
  const M = +pdf.slice(12, 14)
  const S = +pdf.slice(14, 16)
  return new Date(Date.UTC(y, mo, d, H, M, S))
}
export function dateToPdfDate(date = /* @__PURE__ */ new Date()) {
  const z = (n, len = 2) => n.toString().padStart(len, "0")
  const YYYY = date.getUTCFullYear()
  const MM = z(date.getUTCMonth() + 1)
  const DD = z(date.getUTCDate())
  const HH = z(date.getUTCHours())
  const mm = z(date.getUTCMinutes())
  const SS = z(date.getUTCSeconds())
  return `D:${YYYY}${MM}${DD}${HH}${mm}${SS}`
}
export function ignore() {}
