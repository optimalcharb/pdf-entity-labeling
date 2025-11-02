import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState } from "react"
import { jsx, jsxs } from "react/jsx-runtime"

export class DependencyResolver {
  constructor() {
    this.dependencyGraph = /* @__PURE__ */ new Map()
  }
  addNode(id, dependencies = []) {
    this.dependencyGraph.set(id, new Set(dependencies))
  }
  hasCircularDependencies() {
    const visited = /* @__PURE__ */ new Set()
    const recursionStack = /* @__PURE__ */ new Set()
    const dfs = (id) => {
      visited.add(id)
      recursionStack.add(id)
      const dependencies = this.dependencyGraph.get(id) || /* @__PURE__ */ new Set()
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (dfs(dep)) return true
        } else if (recursionStack.has(dep)) {
          return true
        }
      }
      recursionStack.delete(id)
      return false
    }
    for (const id of this.dependencyGraph.keys()) {
      if (!visited.has(id)) {
        if (dfs(id)) return true
      }
    }
    return false
  }
  resolveLoadOrder() {
    if (this.hasCircularDependencies()) {
      throw new Error("Circular dependencies detected")
    }
    const result = []
    const visited = /* @__PURE__ */ new Set()
    const temp = /* @__PURE__ */ new Set()
    const visit = (id) => {
      if (temp.has(id)) throw new Error("Circular dependency")
      if (visited.has(id)) return
      temp.add(id)
      const dependencies = this.dependencyGraph.get(id) || /* @__PURE__ */ new Set()
      for (const dep of dependencies) {
        visit(dep)
      }
      temp.delete(id)
      visited.add(id)
      result.push(id)
    }
    for (const id of this.dependencyGraph.keys()) {
      if (!visited.has(id)) {
        visit(id)
      }
    }
    return result
  }
}
export class PluginRegistrationError extends Error {
  constructor(message) {
    super(message)
    this.name = "PluginRegistrationError"
  }
}
export class PluginNotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = "PluginNotFoundError"
  }
}
export class CircularDependencyError extends Error {
  constructor(message) {
    super(message)
    this.name = "CircularDependencyError"
  }
}
export class CapabilityNotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = "CapabilityNotFoundError"
  }
}
export class CapabilityConflictError extends Error {
  constructor(message) {
    super(message)
    this.name = "CapabilityConflictError"
  }
}
export class PluginInitializationError extends Error {
  constructor(message) {
    super(message)
    this.name = "PluginInitializationError"
  }
}
export class PluginConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "PluginConfigurationError"
  }
}
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
export class EventControl {
  constructor(handler, options) {
    this.handler = handler
    this.options = options
    this.lastRun = 0
    this.handle = (data) => {
      if (this.options.mode === "debounce") {
        this.debounce(data)
      } else {
        this.throttle(data)
      }
    }
  }
  debounce(data) {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId)
    }
    this.timeoutId = window.setTimeout(() => {
      this.handler(data)
      this.timeoutId = void 0
    }, this.options.wait)
  }
  throttle(data) {
    if (this.options.mode === "debounce") return
    const now = Date.now()
    const throttleMode = this.options.throttleMode || "leading-trailing"
    if (now - this.lastRun >= this.options.wait) {
      if (throttleMode === "leading-trailing") {
        this.handler(data)
      }
      this.lastRun = now
    }
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId)
    }
    this.timeoutId = window.setTimeout(
      () => {
        this.handler(data)
        this.lastRun = Date.now()
        this.timeoutId = void 0
      },
      this.options.wait - (now - this.lastRun),
    )
  }
  destroy() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId)
    }
  }
}
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value
}
export function arePropsEqual(a, b, visited) {
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return a === b
  }
  const aType = typeof a
  const bType = typeof b
  if (aType !== bType) return false
  if (aType === "object") {
    if (!visited) visited = /* @__PURE__ */ new Set()
    const pairId = getPairId(a, b)
    if (visited.has(pairId)) {
      return true
    }
    visited.add(pairId)
    const aIsArray = Array.isArray(a)
    const bIsArray = Array.isArray(b)
    if (aIsArray && bIsArray) {
      return arraysEqualUnordered(a, b, visited)
    } else if (!aIsArray && !bIsArray) {
      return objectsEqual(a, b, visited)
    } else {
      return false
    }
  }
  return false
}
function getPairId(a, b) {
  return `${objectId(a)}__${objectId(b)}`
}
let objectIdCounter = 0
const objectIds = /* @__PURE__ */ new WeakMap()
function objectId(obj) {
  if (!objectIds.has(obj)) {
    objectIds.set(obj, ++objectIdCounter)
  }
  return objectIds.get(obj)
}
function arraysEqualUnordered(a, b, visited) {
  if (a.length !== b.length) return false
  const used = new Array(b.length).fill(false)
  outer: for (let i = 0; i < a.length; i++) {
    const elemA = a[i]
    for (let j = 0; j < b.length; j++) {
      if (used[j]) continue
      if (arePropsEqual(elemA, b[j], visited)) {
        used[j] = true
        continue outer
      }
    }
    return false
  }
  return true
}
function objectsEqual(a, b, visited) {
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false
  }
  for (const key of aKeys) {
    const valA = a[key]
    const valB = b[key]
    if (!arePropsEqual(valA, valB, visited)) {
      return false
    }
  }
  return true
}
export function createEmitter() {
  const listeners = /* @__PURE__ */ new Set()
  const on = (l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  return {
    emit: (v = void 0) => listeners.forEach((l) => l(v)),
    on,
    off: (l) => listeners.delete(l),
    clear: () => listeners.clear(),
  }
}
export function createBehaviorEmitter(initial, equality = arePropsEqual) {
  const listeners = /* @__PURE__ */ new Set()
  const proxyMap = /* @__PURE__ */ new Map()
  let _value = initial
  const notify = (v) => listeners.forEach((l) => l(v))
  const baseOn = (listener, options) => {
    let realListener = listener
    let destroy = () => {}
    if (options) {
      const ctl = new EventControl(listener, options)
      realListener = ctl.handle
      destroy = () => ctl.destroy()
      proxyMap.set(listener, { wrapped: realListener, destroy })
    }
    if (_value !== void 0) realListener(_value)
    listeners.add(realListener)
    return () => {
      listeners.delete(realListener)
      destroy()
      proxyMap.delete(listener)
    }
  }
  return {
    /* emitter behaviour ---------------------------------------- */
    get value() {
      return _value
    },
    emit(v = void 0) {
      if (_value === void 0 || !equality(_value, v)) {
        _value = v
        notify(v)
      }
    },
    on: baseOn,
    off(listener) {
      const proxy = proxyMap.get(listener)
      if (proxy) {
        listeners.delete(proxy.wrapped)
        proxy.destroy()
        proxyMap.delete(listener)
      } else {
        listeners.delete(listener)
      }
    },
    clear() {
      listeners.clear()
      proxyMap.forEach((p) => p.destroy())
      proxyMap.clear()
    },
    /* derived hook --------------------------------------------- */
    select(selector, eq = arePropsEqual) {
      return (listener, options) => {
        let prev
        if (_value !== void 0) {
          const mapped = selector(_value)
          prev = mapped
          listener(mapped)
        }
        return baseOn((next) => {
          const mapped = selector(next)
          if (prev === void 0 || !eq(prev, mapped)) {
            prev = mapped
            listener(mapped)
          }
        }, options)
      }
    },
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

export var Rotation = /* @__PURE__ */ ((Rotation2) => {
  Rotation2[(Rotation2["Degree0"] = 0)] = "Degree0"
  Rotation2[(Rotation2["Degree90"] = 1)] = "Degree90"
  Rotation2[(Rotation2["Degree180"] = 2)] = "Degree180"
  Rotation2[(Rotation2["Degree270"] = 3)] = "Degree270"
  return Rotation2
})(Rotation || {})

export function toIntPos(p) {
  return { x: Math.floor(p.x), y: Math.floor(p.y) }
}
export function toIntSize(s) {
  return { width: Math.ceil(s.width), height: Math.ceil(s.height) }
}
export function toIntRect(r) {
  return {
    origin: toIntPos(r.origin),
    size: toIntSize(r.size),
  }
}

export function calculateDegree(rotation) {
  switch (rotation) {
    case 0:
      return 0
    case 1:
      return 90
    case 2:
      return 180
    case 3:
      return 270
  }
}
export function calculateAngle(rotation) {
  return (calculateDegree(rotation) * Math.PI) / 180
}

export function swap(size) {
  const { width, height } = size
  return {
    width: height,
    height: width,
  }
}
export function transformSize(size, rotation, scaleFactor) {
  size = rotation % 2 === 0 ? size : swap(size)
  return {
    width: size.width * scaleFactor,
    height: size.height * scaleFactor,
  }
}
export function quadToRect(q) {
  const xs = [q.p1.x, q.p2.x, q.p3.x, q.p4.x]
  const ys = [q.p1.y, q.p2.y, q.p3.y, q.p4.y]
  return {
    origin: { x: Math.min(...xs), y: Math.min(...ys) },
    size: {
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    },
  }
}
export function rectToQuad(r) {
  return {
    p1: { x: r.origin.x, y: r.origin.y },
    p2: { x: r.origin.x + r.size.width, y: r.origin.y },
    p3: { x: r.origin.x + r.size.width, y: r.origin.y + r.size.height },
    p4: { x: r.origin.x, y: r.origin.y + r.size.height },
  }
}
export function rotatePosition(containerSize, position, rotation) {
  let x = position.x
  let y = position.y
  switch (rotation) {
    case 0:
      x = position.x
      y = position.y
      break
    case 1:
      x = containerSize.height - position.y
      y = position.x
      break
    case 2:
      x = containerSize.width - position.x
      y = containerSize.height - position.y
      break
    case 3:
      x = position.y
      y = containerSize.width - position.x
      break
  }
  return {
    x,
    y,
  }
}
export function scalePosition(position, scaleFactor) {
  return {
    x: position.x * scaleFactor,
    y: position.y * scaleFactor,
  }
}
export function transformPosition(containerSize, position, rotation, scaleFactor) {
  return scalePosition(rotatePosition(containerSize, position, rotation), scaleFactor)
}
export function restorePosition(containerSize, position, rotation, scaleFactor) {
  return scalePosition(rotatePosition(containerSize, position, (4 - rotation) % 4), 1 / scaleFactor)
}
export function rectEquals(a, b) {
  return (
    a.origin.x === b.origin.x &&
    a.origin.y === b.origin.y &&
    a.size.width === b.size.width &&
    a.size.height === b.size.height
  )
}
// deleted rectFromPoints and rotateAndTranslatePoint in plugin-annotation
export function rectFromPoints(positions) {
  if (positions.length === 0) {
    return { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } }
  }
  const xs = positions.map((p) => p.x)
  const ys = positions.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return {
    origin: { x: minX, y: minY },
    size: {
      width: Math.max(...xs) - minX,
      height: Math.max(...ys) - minY,
    },
  }
}
export function rotateAndTranslatePoint(pos, angleRad, translate) {
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const newX = pos.x * cos - pos.y * sin
  const newY = pos.x * sin + pos.y * cos
  return {
    x: newX + translate.x,
    y: newY + translate.y,
  }
}
export function expandRect(rect, padding) {
  return {
    origin: { x: rect.origin.x - padding, y: rect.origin.y - padding },
    size: {
      width: rect.size.width + padding * 2,
      height: rect.size.height + padding * 2,
    },
  }
}
export function rotateRect(containerSize, rect, rotation) {
  let x = rect.origin.x
  let y = rect.origin.y
  let size = rect.size
  switch (rotation) {
    case 0:
      break
    case 1:
      x = containerSize.height - rect.origin.y - rect.size.height
      y = rect.origin.x
      size = swap(rect.size)
      break
    case 2:
      x = containerSize.width - rect.origin.x - rect.size.width
      y = containerSize.height - rect.origin.y - rect.size.height
      break
    case 3:
      x = rect.origin.y
      y = containerSize.width - rect.origin.x - rect.size.width
      size = swap(rect.size)
      break
  }
  return {
    origin: {
      x,
      y,
    },
    size: {
      width: size.width,
      height: size.height,
    },
  }
}
export function scaleRect(rect, scaleFactor) {
  return {
    origin: {
      x: rect.origin.x * scaleFactor,
      y: rect.origin.y * scaleFactor,
    },
    size: {
      width: rect.size.width * scaleFactor,
      height: rect.size.height * scaleFactor,
    },
  }
}
export function transformRect(containerSize, rect, rotation, scaleFactor) {
  return scaleRect(rotateRect(containerSize, rect, rotation), scaleFactor)
}
export function restoreRect(containerSize, rect, rotation, scaleFactor) {
  return scaleRect(rotateRect(containerSize, rect, (4 - rotation) % 4), 1 / scaleFactor)
}
export function restoreOffset(offset, rotation, scaleFactor) {
  let offsetX = offset.x
  let offsetY = offset.y
  switch (rotation) {
    case 0:
      offsetX = offset.x / scaleFactor
      offsetY = offset.y / scaleFactor
      break
    case 1:
      offsetX = offset.y / scaleFactor
      offsetY = -offset.x / scaleFactor
      break
    case 2:
      offsetX = -offset.x / scaleFactor
      offsetY = -offset.y / scaleFactor
      break
    case 3:
      offsetX = -offset.y / scaleFactor
      offsetY = offset.x / scaleFactor
      break
  }
  return {
    x: offsetX,
    y: offsetY,
  }
}
export function boundingRect(rects) {
  if (rects.length === 0) return null
  let minX = rects[0].origin.x,
    minY = rects[0].origin.y,
    maxX = rects[0].origin.x + rects[0].size.width,
    maxY = rects[0].origin.y + rects[0].size.height
  for (const r of rects) {
    minX = Math.min(minX, r.origin.x)
    minY = Math.min(minY, r.origin.y)
    maxX = Math.max(maxX, r.origin.x + r.size.width)
    maxY = Math.max(maxY, r.origin.y + r.size.height)
  }
  return {
    origin: {
      x: minX,
      y: minY,
    },
    size: {
      width: maxX - minX,
      height: maxY - minY,
    },
  }
}

export function buildUserToDeviceMatrix(rect, rotation, outW, outH) {
  const L = rect.origin.x
  const B = rect.origin.y
  const W = rect.size.width
  const H = rect.size.height
  const sx0 = outW / W
  const sy0 = outH / H
  const sx90 = outW / H
  const sy90 = outH / W
  switch (rotation) {
    case 0:
      return { a: sx0, b: 0, c: 0, d: sy0, e: -sx0 * L, f: -sy0 * B }
    case 3:
      return { a: 0, b: -sy90, c: sx90, d: 0, e: -sx90 * B, f: sy90 * (L + W) }
    case 2:
      return {
        a: -sx0,
        b: 0,
        c: 0,
        d: -sy0,
        e: sx0 * (L + W),
        f: sy0 * (B + H),
      }
    case 1:
      return { a: 0, b: sy90, c: -sx90, d: 0, e: sx90 * (B + H), f: -sy90 * L }
  }
}

export class NoopLogger {
  /** {@inheritDoc Logger.isEnabled} */
  isEnabled() {
    return false
  }
  /** {@inheritDoc Logger.debug} */
  debug() {}
  /** {@inheritDoc Logger.info} */
  info() {}
  /** {@inheritDoc Logger.warn} */
  warn() {}
  /** {@inheritDoc Logger.error} */
  error() {}
  /** {@inheritDoc Logger.perf} */
  perf() {}
}
export class ConsoleLogger {
  /** {@inheritDoc Logger.isEnabled} */
  isEnabled() {
    return true
  }
  /** {@inheritDoc Logger.debug} */
  debug(source, category, ...args) {
    console.debug(`${source}.${category}`, ...args)
  }
  /** {@inheritDoc Logger.info} */
  info(source, category, ...args) {
    console.info(`${source}.${category}`, ...args)
  }
  /** {@inheritDoc Logger.warn} */
  warn(source, category, ...args) {
    console.warn(`${source}.${category}`, ...args)
  }
  /** {@inheritDoc Logger.error} */
  error(source, category, ...args) {
    console.error(`${source}.${category}`, ...args)
  }
  /** {@inheritDoc Logger.perf} */
  perf(source, category, event, phase, ...args) {
    console.info(`${source}.${category}.${event}.${phase}`, ...args)
  }
}

export var TaskStage = /* @__PURE__ */ ((TaskStage2) => {
  TaskStage2[(TaskStage2["Pending"] = 0)] = "Pending"
  TaskStage2[(TaskStage2["Resolved"] = 1)] = "Resolved"
  TaskStage2[(TaskStage2["Rejected"] = 2)] = "Rejected"
  TaskStage2[(TaskStage2["Aborted"] = 3)] = "Aborted"
  return TaskStage2
})(TaskStage || {})
export class TaskAbortedError extends Error {
  constructor(reason) {
    super(`Task aborted: ${JSON.stringify(reason)}`)
    this.name = "TaskAbortedError"
    this.reason = reason
  }
}
export class TaskRejectedError extends Error {
  constructor(reason) {
    super(`Task rejected: ${JSON.stringify(reason)}`)
    this.name = "TaskRejectedError"
    this.reason = reason
  }
}
export class Task {
  constructor() {
    this.state = {
      stage: 0,
      /* Pending */
    }
    this.resolvedCallbacks = []
    this.rejectedCallbacks = []
    this._promise = null
    this.progressCbs = []
  }
  /**
   * Convert task to promise
   * @returns promise that will be resolved when task is settled
   */
  toPromise() {
    if (!this._promise) {
      this._promise = new Promise((resolve, reject) => {
        this.wait(
          (result) => resolve(result),
          (error) => {
            if (error.type === "abort") {
              reject(new TaskAbortedError(error.reason))
            } else {
              reject(new TaskRejectedError(error.reason))
            }
          },
        )
      })
    }
    return this._promise
  }
  /**
   * wait for task to be settled
   * @param resolvedCallback - callback for resolved value
   * @param rejectedCallback - callback for rejected value
   */
  wait(resolvedCallback, rejectedCallback) {
    switch (this.state.stage) {
      case 0:
        this.resolvedCallbacks.push(resolvedCallback)
        this.rejectedCallbacks.push(rejectedCallback)
        break
      case 1:
        resolvedCallback(this.state.result)
        break
      case 2:
        rejectedCallback({
          type: "reject",
          reason: this.state.reason,
        })
        break
      case 3:
        rejectedCallback({
          type: "abort",
          reason: this.state.reason,
        })
        break
    }
  }
  /**
   * resolve task with specific result
   * @param result - result value
   */
  resolve(result) {
    if (this.state.stage === 0) {
      this.state = {
        stage: 1,
        result,
      }
      for (const resolvedCallback of this.resolvedCallbacks) {
        try {
          resolvedCallback(result)
        } catch (e) {}
      }
      this.resolvedCallbacks = []
      this.rejectedCallbacks = []
    }
  }
  /**
   * reject task with specific reason
   * @param reason - abort reason
   *
   */
  reject(reason) {
    if (this.state.stage === 0) {
      this.state = {
        stage: 2,
        reason,
      }
      for (const rejectedCallback of this.rejectedCallbacks) {
        try {
          rejectedCallback({
            type: "reject",
            reason,
          })
        } catch (e) {}
      }
      this.resolvedCallbacks = []
      this.rejectedCallbacks = []
    }
  }
  /**
   * abort task with specific reason
   * @param reason - abort reason
   */
  abort(reason) {
    if (this.state.stage === 0) {
      this.state = {
        stage: 3,
        reason,
      }
      for (const rejectedCallback of this.rejectedCallbacks) {
        try {
          rejectedCallback({
            type: "abort",
            reason,
          })
        } catch (e) {}
      }
      this.resolvedCallbacks = []
      this.rejectedCallbacks = []
    }
  }
  /**
   * fail task with a TaskError from another task
   * This is a convenience method for error propagation between tasks
   * @param error - TaskError from another task
   */
  fail(error) {
    if (error.type === "abort") {
      this.abort(error.reason)
    } else {
      this.reject(error.reason)
    }
  }
  /**
   * add a progress callback
   * @param cb - progress callback
   */
  onProgress(cb) {
    this.progressCbs.push(cb)
  }
  /**
   * call progress callback
   * @param p - progress value
   */
  progress(p) {
    for (const cb of this.progressCbs) cb(p)
  }
  /**
   * Static method to wait for all tasks to resolve
   * Returns a new task that resolves with an array of all results
   * Rejects immediately if any task fails
   *
   * @param tasks - array of tasks to wait for
   * @returns new task that resolves when all input tasks resolve
   * @public
   */
  static all(tasks) {
    const combinedTask = new Task()
    if (tasks.length === 0) {
      combinedTask.resolve([])
      return combinedTask
    }
    const results = new Array(tasks.length)
    let resolvedCount = 0
    let isSettled = false
    tasks.forEach((task, index) => {
      task.wait(
        (result) => {
          if (isSettled) return
          results[index] = result
          resolvedCount++
          if (resolvedCount === tasks.length) {
            isSettled = true
            combinedTask.resolve(results)
          }
        },
        (error) => {
          if (isSettled) return
          isSettled = true
          if (error.type === "abort") {
            combinedTask.abort(error.reason)
          } else {
            combinedTask.reject(error.reason)
          }
        },
      )
    })
    return combinedTask
  }
  /**
   * Static method to wait for all tasks to settle (resolve, reject, or abort)
   * Always resolves with an array of settlement results
   *
   * @param tasks - array of tasks to wait for
   * @returns new task that resolves when all input tasks settle
   * @public
   */
  static allSettled(tasks) {
    const combinedTask = new Task()
    if (tasks.length === 0) {
      combinedTask.resolve([])
      return combinedTask
    }
    const results = new Array(tasks.length)
    let settledCount = 0
    tasks.forEach((task, index) => {
      task.wait(
        (result) => {
          results[index] = { status: "resolved", value: result }
          settledCount++
          if (settledCount === tasks.length) {
            combinedTask.resolve(results)
          }
        },
        (error) => {
          results[index] = {
            status: error.type === "abort" ? "aborted" : "rejected",
            reason: error.reason,
          }
          settledCount++
          if (settledCount === tasks.length) {
            combinedTask.resolve(results)
          }
        },
      )
    })
    return combinedTask
  }
  /**
   * Static method that resolves/rejects with the first task that settles
   *
   * @param tasks - array of tasks to race
   * @returns new task that settles with the first input task that settles
   * @public
   */
  static race(tasks) {
    const combinedTask = new Task()
    if (tasks.length === 0) {
      combinedTask.reject("No tasks provided")
      return combinedTask
    }
    let isSettled = false
    tasks.forEach((task) => {
      task.wait(
        (result) => {
          if (isSettled) return
          isSettled = true
          combinedTask.resolve(result)
        },
        (error) => {
          if (isSettled) return
          isSettled = true
          if (error.type === "abort") {
            combinedTask.abort(error.reason)
          } else {
            combinedTask.reject(error.reason)
          }
        },
      )
    })
    return combinedTask
  }
  /**
   * Utility to track progress of multiple tasks
   *
   * @param tasks - array of tasks to track
   * @param onProgress - callback called when any task completes
   * @returns new task that resolves when all input tasks resolve
   * @public
   */
  static withProgress(tasks, onProgress) {
    const combinedTask = Task.all(tasks)
    if (onProgress) {
      let completedCount = 0
      tasks.forEach((task) => {
        task.wait(
          () => {
            completedCount++
            onProgress(completedCount, tasks.length)
          },
          () => {
            completedCount++
            onProgress(completedCount, tasks.length)
          },
        )
      })
    }
    return combinedTask
  }
}

const PdfSoftHyphenMarker = "\u00AD"
const PdfZeroWidthSpace = "\u200B"
const PdfWordJoiner = "\u2060"
const PdfBomOrZwnbsp = "\uFEFF"
const PdfNonCharacterFFFE = "\uFFFE"
const PdfNonCharacterFFFF = "\uFFFF"
const PdfUnwantedTextMarkers = Object.freeze([
  PdfSoftHyphenMarker,
  PdfZeroWidthSpace,
  PdfWordJoiner,
  PdfBomOrZwnbsp,
  PdfNonCharacterFFFE,
  PdfNonCharacterFFFF,
])
const PdfUnwantedTextRegex = new RegExp(`[${PdfUnwantedTextMarkers.join("")}]`, "g")
export function stripPdfUnwantedMarkers(text) {
  return text.replace(PdfUnwantedTextRegex, "")
}

export var PdfZoomMode = /* @__PURE__ */ ((PdfZoomMode2) => {
  PdfZoomMode2[(PdfZoomMode2["Unknown"] = 0)] = "Unknown"
  PdfZoomMode2[(PdfZoomMode2["XYZ"] = 1)] = "XYZ"
  PdfZoomMode2[(PdfZoomMode2["FitPage"] = 2)] = "FitPage"
  PdfZoomMode2[(PdfZoomMode2["FitHorizontal"] = 3)] = "FitHorizontal"
  PdfZoomMode2[(PdfZoomMode2["FitVertical"] = 4)] = "FitVertical"
  PdfZoomMode2[(PdfZoomMode2["FitRectangle"] = 5)] = "FitRectangle"
  PdfZoomMode2[(PdfZoomMode2["FitBoundingBox"] = 6)] = "FitBoundingBox"
  PdfZoomMode2[(PdfZoomMode2["FitBoundingBoxHorizontal"] = 7)] = "FitBoundingBoxHorizontal"
  PdfZoomMode2[(PdfZoomMode2["FitBoundingBoxVertical"] = 8)] = "FitBoundingBoxVertical"
  return PdfZoomMode2
})(PdfZoomMode || {})
export var PdfTrappedStatus = /* @__PURE__ */ ((PdfTrappedStatus2) => {
  PdfTrappedStatus2[(PdfTrappedStatus2["NotSet"] = 0)] = "NotSet"
  PdfTrappedStatus2[(PdfTrappedStatus2["True"] = 1)] = "True"
  PdfTrappedStatus2[(PdfTrappedStatus2["False"] = 2)] = "False"
  PdfTrappedStatus2[(PdfTrappedStatus2["Unknown"] = 3)] = "Unknown"
  return PdfTrappedStatus2
})(PdfTrappedStatus || {})
export var PdfActionType = /* @__PURE__ */ ((PdfActionType2) => {
  PdfActionType2[(PdfActionType2["Unsupported"] = 0)] = "Unsupported"
  PdfActionType2[(PdfActionType2["Goto"] = 1)] = "Goto"
  PdfActionType2[(PdfActionType2["RemoteGoto"] = 2)] = "RemoteGoto"
  PdfActionType2[(PdfActionType2["URI"] = 3)] = "URI"
  PdfActionType2[(PdfActionType2["LaunchAppOrOpenFile"] = 4)] = "LaunchAppOrOpenFile"
  return PdfActionType2
})(PdfActionType || {})
export var AppearanceMode = /* @__PURE__ */ ((AppearanceMode2) => {
  AppearanceMode2[(AppearanceMode2["Normal"] = 0)] = "Normal"
  AppearanceMode2[(AppearanceMode2["Rollover"] = 1)] = "Rollover"
  AppearanceMode2[(AppearanceMode2["Down"] = 2)] = "Down"
  return AppearanceMode2
})(AppearanceMode || {})
export var PdfPageObjectType = /* @__PURE__ */ ((PdfPageObjectType2) => {
  PdfPageObjectType2[(PdfPageObjectType2["UNKNOWN"] = 0)] = "UNKNOWN"
  PdfPageObjectType2[(PdfPageObjectType2["TEXT"] = 1)] = "TEXT"
  PdfPageObjectType2[(PdfPageObjectType2["PATH"] = 2)] = "PATH"
  PdfPageObjectType2[(PdfPageObjectType2["IMAGE"] = 3)] = "IMAGE"
  PdfPageObjectType2[(PdfPageObjectType2["SHADING"] = 4)] = "SHADING"
  PdfPageObjectType2[(PdfPageObjectType2["FORM"] = 5)] = "FORM"
  return PdfPageObjectType2
})(PdfPageObjectType || {})
export var PdfSegmentObjectType = /* @__PURE__ */ ((PdfSegmentObjectType2) => {
  PdfSegmentObjectType2[(PdfSegmentObjectType2["UNKNOWN"] = -1)] = "UNKNOWN"
  PdfSegmentObjectType2[(PdfSegmentObjectType2["LINETO"] = 0)] = "LINETO"
  PdfSegmentObjectType2[(PdfSegmentObjectType2["BEZIERTO"] = 1)] = "BEZIERTO"
  PdfSegmentObjectType2[(PdfSegmentObjectType2["MOVETO"] = 2)] = "MOVETO"
  return PdfSegmentObjectType2
})(PdfSegmentObjectType || {})
export var PdfEngineFeature = /* @__PURE__ */ ((PdfEngineFeature2) => {
  PdfEngineFeature2[(PdfEngineFeature2["RenderPage"] = 0)] = "RenderPage"
  PdfEngineFeature2[(PdfEngineFeature2["RenderPageRect"] = 1)] = "RenderPageRect"
  PdfEngineFeature2[(PdfEngineFeature2["Thumbnails"] = 2)] = "Thumbnails"
  PdfEngineFeature2[(PdfEngineFeature2["Bookmarks"] = 3)] = "Bookmarks"
  PdfEngineFeature2[(PdfEngineFeature2["Annotations"] = 4)] = "Annotations"
  return PdfEngineFeature2
})(PdfEngineFeature || {})
export var PdfEngineOperation = /* @__PURE__ */ ((PdfEngineOperation2) => {
  PdfEngineOperation2[(PdfEngineOperation2["Create"] = 0)] = "Create"
  PdfEngineOperation2[(PdfEngineOperation2["Read"] = 1)] = "Read"
  PdfEngineOperation2[(PdfEngineOperation2["Update"] = 2)] = "Update"
  PdfEngineOperation2[(PdfEngineOperation2["Delete"] = 3)] = "Delete"
  return PdfEngineOperation2
})(PdfEngineOperation || {})
export var PdfErrorCode = /* @__PURE__ */ ((PdfErrorCode2) => {
  PdfErrorCode2[(PdfErrorCode2["Ok"] = 0)] = "Ok"
  PdfErrorCode2[(PdfErrorCode2["Unknown"] = 1)] = "Unknown"
  PdfErrorCode2[(PdfErrorCode2["NotFound"] = 2)] = "NotFound"
  PdfErrorCode2[(PdfErrorCode2["WrongFormat"] = 3)] = "WrongFormat"
  PdfErrorCode2[(PdfErrorCode2["Password"] = 4)] = "Password"
  PdfErrorCode2[(PdfErrorCode2["Security"] = 5)] = "Security"
  PdfErrorCode2[(PdfErrorCode2["PageError"] = 6)] = "PageError"
  PdfErrorCode2[(PdfErrorCode2["XFALoad"] = 7)] = "XFALoad"
  PdfErrorCode2[(PdfErrorCode2["XFALayout"] = 8)] = "XFALayout"
  PdfErrorCode2[(PdfErrorCode2["Cancelled"] = 9)] = "Cancelled"
  PdfErrorCode2[(PdfErrorCode2["Initialization"] = 10)] = "Initialization"
  PdfErrorCode2[(PdfErrorCode2["NotReady"] = 11)] = "NotReady"
  PdfErrorCode2[(PdfErrorCode2["NotSupport"] = 12)] = "NotSupport"
  PdfErrorCode2[(PdfErrorCode2["LoadDoc"] = 13)] = "LoadDoc"
  PdfErrorCode2[(PdfErrorCode2["DocNotOpen"] = 14)] = "DocNotOpen"
  PdfErrorCode2[(PdfErrorCode2["CantCloseDoc"] = 15)] = "CantCloseDoc"
  PdfErrorCode2[(PdfErrorCode2["CantCreateNewDoc"] = 16)] = "CantCreateNewDoc"
  PdfErrorCode2[(PdfErrorCode2["CantImportPages"] = 17)] = "CantImportPages"
  PdfErrorCode2[(PdfErrorCode2["CantCreateAnnot"] = 18)] = "CantCreateAnnot"
  PdfErrorCode2[(PdfErrorCode2["CantSetAnnotRect"] = 19)] = "CantSetAnnotRect"
  PdfErrorCode2[(PdfErrorCode2["CantSetAnnotContent"] = 20)] = "CantSetAnnotContent"
  PdfErrorCode2[(PdfErrorCode2["CantRemoveInkList"] = 21)] = "CantRemoveInkList"
  PdfErrorCode2[(PdfErrorCode2["CantAddInkStoke"] = 22)] = "CantAddInkStoke"
  PdfErrorCode2[(PdfErrorCode2["CantReadAttachmentSize"] = 23)] = "CantReadAttachmentSize"
  PdfErrorCode2[(PdfErrorCode2["CantReadAttachmentContent"] = 24)] = "CantReadAttachmentContent"
  PdfErrorCode2[(PdfErrorCode2["CantFocusAnnot"] = 25)] = "CantFocusAnnot"
  PdfErrorCode2[(PdfErrorCode2["CantSelectText"] = 26)] = "CantSelectText"
  PdfErrorCode2[(PdfErrorCode2["CantSelectOption"] = 27)] = "CantSelectOption"
  PdfErrorCode2[(PdfErrorCode2["CantCheckField"] = 28)] = "CantCheckField"
  PdfErrorCode2[(PdfErrorCode2["CantSetAnnotString"] = 29)] = "CantSetAnnotString"
  return PdfErrorCode2
})(PdfErrorCode || {})

export class PdfTaskHelper {
  /**
   * Create a task
   * @returns new task
   */
  static create() {
    return new Task()
  }
  /**
   * Create a task that has been resolved with value
   * @param result - resolved value
   * @returns resolved task
   */
  static resolve(result) {
    const task = new Task()
    task.resolve(result)
    return task
  }
  /**
   * Create a task that has been rejected with error
   * @param reason - rejected error
   * @returns rejected task
   */
  static reject(reason) {
    const task = new Task()
    task.reject(reason)
    return task
  }
  /**
   * Create a task that has been aborted with error
   * @param reason - aborted error
   * @returns aborted task
   */
  static abort(reason) {
    const task = new Task()
    task.reject(reason)
    return task
  }
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

export function serializeLogger(logger) {
  if (logger instanceof ConsoleLogger) {
    return { type: "console" }
  }
  return { type: "noop" }
}
export function deserializeLogger(serialized) {
  switch (serialized.type) {
    case "noop":
      return new NoopLogger()
    case "console":
      return new ConsoleLogger()
    default:
      return new NoopLogger()
  }
}
const V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function isUuidV4(str) {
  return V4_REGEX.test(str)
}
export function getRandomBytes(len) {
  var _a
  if (typeof ((_a = globalThis.crypto) == null ? void 0 : _a.getRandomValues) === "function") {
    return globalThis.crypto.getRandomValues(new Uint8Array(len))
  }
  if (typeof require === "function") {
    try {
      const { randomBytes } = require("crypto")
      return randomBytes(len)
    } catch {}
  }
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256)
  return bytes
}
export function uuidV4() {
  var _a
  if (typeof ((_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) === "function") {
    return globalThis.crypto.randomUUID()
  }
  const bytes = getRandomBytes(16)
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
export function ignore() {}
