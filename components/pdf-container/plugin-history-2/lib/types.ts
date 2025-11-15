import { BasePluginConfig, EventHook } from '@embedpdf/core';

export interface HistoryPluginConfig extends BasePluginConfig {}

/**
 * The core Command interface that other plugins will implement.
 */
export interface Command {
  /** A function that applies the change. */
  execute(): void;
  /** A function that reverts the change. */
  undo(): void;
}

/**
 * An entry in the global timeline, associating a command with its topic.
 */
export interface HistoryEntry {
  command: Command;
  topic: string;
}

/**
 * Information about the history state, to be emitted for UI updates.
 * Includes a global state and a record of each topic's state.
 */
export interface HistoryState {
  global: {
    canUndo: boolean;
    canRedo: boolean;
  };
  topics: Record<string, { canUndo: boolean; canRedo: boolean }>;
}

export interface HistoryCapability {
  /**
   * Registers a command with the history stack.
   * @param command The command to register, with `execute` and `undo` methods.
   * @param topic A string identifier for the history scope (e.g., 'annotations').
   */
  register: (command: Command, topic: string) => void;

  /**
   * Undoes the last command.
   * @param topic If provided, undoes the last command for that specific topic.
   * If omitted, performs a global undo of the very last action.
   */
  undo: (topic?: string) => void;

  /**
   * Redoes the last undone command.
   * @param topic If provided, redoes the last command for that specific topic.
   * If omitted, performs a global redo.
   */
  redo: (topic?: string) => void;

  /**
   * Checks if an undo operation is possible.
   * @param topic If provided, checks for the specific topic. Otherwise, checks globally.
   */
  canUndo: (topic?: string) => boolean;

  /**
   * Checks if a redo operation is possible.
   * @param topic If provided, checks for the specific topic. Otherwise, checks globally.
   */
  canRedo: (topic?: string) => boolean;

  /**
   * An event hook that fires whenever a history action occurs.
   * @param topic The topic string that was affected by the action.
   */
  onHistoryChange: EventHook<string | undefined>;

  /**
   * Returns the current undo/redo state for all topics and the global timeline.
   */
  getHistoryState: () => HistoryState;
}
