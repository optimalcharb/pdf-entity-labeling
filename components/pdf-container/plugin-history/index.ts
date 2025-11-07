import type {
  Action,
  BasePluginConfig,
  EventHook,
  PluginManifest,
  PluginPackage,
  PluginRegistry,
  Reducer,
} from "../core"
import { BasePlugin, createEmitter, useCapability, usePlugin } from "../core"

// *****CUSTOM TYPES******
export interface Command {
  /** A function that applies the change. */
  execute(): void
  /** A function that reverts the change. */
  undo(): void
}
export interface HistoryEntry {
  command: Command
  topic: string
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const HISTORY_PLUGIN_ID = "history"

// ***STATE***
export interface HistoryState {
  global: {
    canUndo: boolean
    canRedo: boolean
  }
  topics: Record<
    string,
    {
      canUndo: boolean
      canRedo: boolean
    }
  >
}

// ***INITIAL STATE***
const initialState: HistoryState = {
  global: {
    canUndo: false,
    canRedo: false,
  },
  topics: {},
}

// ***ACTION CONSTANTS***
const SET_HISTORY_STATE = "HISTORY/SET_STATE" as const

// ***ACTION INTERFACES***
interface SetHistoryStateAction extends Action {
  type: typeof SET_HISTORY_STATE
  payload: HistoryState
}

// ***ACTION UNION***
export type HistoryAction = SetHistoryStateAction

// ***ACTION CREATORS***
const setHistoryState = (state: HistoryState) => ({
  type: SET_HISTORY_STATE,
  payload: state,
})

// ***ACTION REDUCER***
const reducer: Reducer<HistoryState, HistoryAction> = (
  state = initialState,
  action: HistoryAction,
) => {
  switch (action.type) {
    case SET_HISTORY_STATE:
      return {
        ...state,
        ...action.payload,
      }
    default:
      return state
  }
}

// ***PLUGIN CAPABILITY***
export interface HistoryCapability {
  /**
   * Registers a command with the history stack.
   * @param command The command to register, with `execute` and `undo` methods.
   * @param topic A string identifier for the history scope (e.g., 'annotations').
   */
  register: (command: Command, topic: string) => void
  /**
   * Undoes the last command.
   * @param topic If provided, undoes the last command for that specific topic.
   * If omitted, performs a global undo of the very last action.
   */
  undo: (topic?: string) => void
  /**
   * Redoes the last undone command.
   * @param topic If provided, redoes the last command for that specific topic.
   * If omitted, performs a global redo.
   */
  redo: (topic?: string) => void
  /**
   * Checks if an undo operation is possible.
   * @param topic If provided, checks for the specific topic. Otherwise, checks globally.
   */
  canUndo: (topic?: string) => boolean
  /**
   * Checks if a redo operation is possible.
   * @param topic If provided, checks for the specific topic. Otherwise, checks globally.
   */
  canRedo: (topic?: string) => boolean
  /**
   * An event hook that fires whenever a history action occurs.
   * @param topic The topic string that was affected by the action.
   */
  onHistoryChange: EventHook<string | undefined>
  /**
   * Returns the current undo/redo state for all topics and the global timeline.
   */
  getHistoryState: () => HistoryState
}

// ***PLUGIN CONFIG***
// uses BasePluginConfig

// ***PLUGIN CLASS***
export class HistoryPlugin extends BasePlugin<
  BasePluginConfig, // uses base plugin config, no configuration specific to this plugin
  HistoryCapability,
  HistoryState,
  HistoryAction
> {
  static readonly id: string = HISTORY_PLUGIN_ID

  private readonly topicHistories: Map<string, { commands: Command[]; currentIndex: number }>
  private globalTimeline: HistoryEntry[]
  private globalIndex: number
  private readonly historyChange$: ReturnType<typeof createEmitter<string | undefined>>

  constructor(id: string, registry: PluginRegistry) {
    super(id, registry)
    this.topicHistories = /* @__PURE__ */ new Map<
      string,
      { commands: Command[]; currentIndex: number }
    >()
    this.globalTimeline = []
    this.globalIndex = -1
    this.historyChange$ = createEmitter<string | undefined>()
  }
  async initialize(_: BasePluginConfig): Promise<void> {}
  private getHistoryState(): HistoryState {
    const topics: Record<string, { canUndo: boolean; canRedo: boolean }> = {}
    Array.from(this.topicHistories.entries()).forEach(([topic, history]) => {
      topics[topic] = {
        canUndo: history.currentIndex > -1,
        canRedo: history.currentIndex < history.commands.length - 1,
      }
    })
    return {
      global: {
        canUndo: this.globalIndex > -1,
        canRedo: this.globalIndex < this.globalTimeline.length - 1,
      },
      topics,
    }
  }
  // The emit function now accepts the topic to broadcast.
  private emitHistoryChange(topic?: string): void {
    this.dispatch(setHistoryState(this.getHistoryState()))
    this.historyChange$.emit(topic)
  }
  buildCapability() {
    return {
      getHistoryState: () => this.state,
      onHistoryChange: this.historyChange$.on,
      register: (command: Command, topic: string) => {
        if (!this.topicHistories.has(topic)) {
          this.topicHistories.set(topic, { commands: [], currentIndex: -1 })
        }
        const topicHistory = this.topicHistories.get(topic)!
        topicHistory.commands.splice(topicHistory.currentIndex + 1)
        topicHistory.commands.push(command)
        topicHistory.currentIndex++
        const historyEntry = { command, topic }
        this.globalTimeline.splice(this.globalIndex + 1)
        this.globalTimeline.push(historyEntry)
        this.globalIndex++
        command.execute()
        this.emitHistoryChange(topic)
      },
      undo: (topic?: string) => {
        let affectedTopic: string | undefined
        if (topic) {
          const topicHistory = this.topicHistories.get(topic)
          if (topicHistory && topicHistory.currentIndex > -1) {
            topicHistory.commands[topicHistory.currentIndex].undo()
            topicHistory.currentIndex--
            affectedTopic = topic
          }
        } else {
          if (this.globalIndex > -1) {
            const entry = this.globalTimeline[this.globalIndex]
            entry.command.undo()
            this.topicHistories.get(entry.topic)!.currentIndex--
            this.globalIndex--
            affectedTopic = entry.topic
          }
        }
        if (affectedTopic) this.emitHistoryChange(affectedTopic)
      },
      redo: (topic?: string) => {
        let affectedTopic: string | undefined
        if (topic) {
          const topicHistory = this.topicHistories.get(topic)
          if (topicHistory && topicHistory.currentIndex < topicHistory.commands.length - 1) {
            topicHistory.currentIndex++
            topicHistory.commands[topicHistory.currentIndex].execute()
            affectedTopic = topic
          }
        } else {
          if (this.globalIndex < this.globalTimeline.length - 1) {
            this.globalIndex++
            const entry = this.globalTimeline[this.globalIndex]
            entry.command.execute()
            this.topicHistories.get(entry.topic)!.currentIndex++
            affectedTopic = entry.topic
          }
        }
        if (affectedTopic) this.emitHistoryChange(affectedTopic)
      },
      canUndo: (topic?: string) => {
        if (topic) {
          const history = this.topicHistories.get(topic)
          return !!history && history.currentIndex > -1
        }
        return this.globalIndex > -1
      },
      canRedo: (topic?: string) => {
        if (topic) {
          const history = this.topicHistories.get(topic)
          return !!history && history.currentIndex < history.commands.length - 1
        }
        return this.globalIndex < this.globalTimeline.length - 1
      },
    }
  }
}

// ***MANIFEST***
const manifest: PluginManifest<BasePluginConfig> = {
  id: HISTORY_PLUGIN_ID,
  name: "History Plugin",
  version: "1.0.0",
  provides: [HISTORY_PLUGIN_ID],
  requires: [],
  optional: [],
  defaultConfig: {
    enabled: true,
  },
}

// ***PLUGIN PACKAGE***
export const HistoryPluginPackage: PluginPackage<
  HistoryPlugin,
  BasePluginConfig,
  HistoryState,
  HistoryAction
> = {
  manifest,
  create: (registry) => new HistoryPlugin(HISTORY_PLUGIN_ID, registry),
  reducer,
  initialState,
}

// ***PLUGIN HOOKS***
export const useHistoryPlugin = () => usePlugin<HistoryPlugin>(HISTORY_PLUGIN_ID)
export const useHistoryCapability = () => useCapability<HistoryPlugin>(HISTORY_PLUGIN_ID)
