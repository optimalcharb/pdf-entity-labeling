import { BasePlugin, createEmitter, PluginRegistry } from '@embedpdf/core';
import {
  Command,
  HistoryCapability,
  HistoryEntry,
  HistoryPluginConfig,
  HistoryState,
} from './types';
import { HistoryAction, setHistoryState } from './actions';

export class HistoryPlugin extends BasePlugin<
  HistoryPluginConfig,
  HistoryCapability,
  HistoryState,
  HistoryAction
> {
  static readonly id = 'history' as const;

  private readonly topicHistories = new Map<
    string,
    { commands: Command[]; currentIndex: number }
  >();
  private globalTimeline: HistoryEntry[] = [];
  private globalIndex = -1;

  // This emitter will now broadcast the topic string of the affected history.
  private readonly historyChange$ = createEmitter<string | undefined>();

  constructor(id: string, registry: PluginRegistry) {
    super(id, registry);
  }

  async initialize(_: HistoryPluginConfig): Promise<void> {}

  private getHistoryState(): HistoryState {
    const topics: HistoryState['topics'] = {};
    Array.from(this.topicHistories.entries()).forEach(([topic, history]) => {
      topics[topic] = {
        canUndo: history.currentIndex > -1,
        canRedo: history.currentIndex < history.commands.length - 1,
      };
    });
    return {
      global: {
        canUndo: this.globalIndex > -1,
        canRedo: this.globalIndex < this.globalTimeline.length - 1,
      },
      topics,
    };
  }

  // The emit function now accepts the topic to broadcast.
  private emitHistoryChange(topic: string) {
    // update the state
    this.dispatch(setHistoryState(this.getHistoryState()));

    // emit the event
    this.historyChange$.emit(topic);
  }

  protected buildCapability(): HistoryCapability {
    return {
      getHistoryState: () => this.state,
      onHistoryChange: this.historyChange$.on,

      register: (command: Command, topic: string) => {
        // 1. Manage Topic History
        if (!this.topicHistories.has(topic)) {
          this.topicHistories.set(topic, { commands: [], currentIndex: -1 });
        }
        const topicHistory = this.topicHistories.get(topic)!;
        topicHistory.commands.splice(topicHistory.currentIndex + 1);
        topicHistory.commands.push(command);
        topicHistory.currentIndex++;

        // 2. Manage Global History
        const historyEntry: HistoryEntry = { command, topic };
        this.globalTimeline.splice(this.globalIndex + 1);
        this.globalTimeline.push(historyEntry);
        this.globalIndex++;

        // 3. Execute and notify with the specific topic
        command.execute();
        this.emitHistoryChange(topic);
      },

      undo: (topic?: string) => {
        let affectedTopic: string | undefined;

        if (topic) {
          // Scoped Undo
          const topicHistory = this.topicHistories.get(topic);
          if (topicHistory && topicHistory.currentIndex > -1) {
            topicHistory.commands[topicHistory.currentIndex].undo();
            topicHistory.currentIndex--;
            affectedTopic = topic;
          }
        } else {
          // Global Undo
          if (this.globalIndex > -1) {
            const entry = this.globalTimeline[this.globalIndex];
            entry.command.undo();
            this.topicHistories.get(entry.topic)!.currentIndex--;
            this.globalIndex--;
            affectedTopic = entry.topic;
          }
        }
        if (affectedTopic) this.emitHistoryChange(affectedTopic);
      },

      redo: (topic?: string) => {
        let affectedTopic: string | undefined;

        if (topic) {
          // Scoped Redo
          const topicHistory = this.topicHistories.get(topic);
          if (topicHistory && topicHistory.currentIndex < topicHistory.commands.length - 1) {
            topicHistory.currentIndex++;
            topicHistory.commands[topicHistory.currentIndex].execute();
            affectedTopic = topic;
          }
        } else {
          // Global Redo
          if (this.globalIndex < this.globalTimeline.length - 1) {
            this.globalIndex++;
            const entry = this.globalTimeline[this.globalIndex];
            entry.command.execute();
            this.topicHistories.get(entry.topic)!.currentIndex++;
            affectedTopic = entry.topic;
          }
        }
        if (affectedTopic) this.emitHistoryChange(affectedTopic);
      },

      canUndo: (topic?: string) => {
        if (topic) {
          const history = this.topicHistories.get(topic);
          return !!history && history.currentIndex > -1;
        }
        return this.globalIndex > -1;
      },

      canRedo: (topic?: string) => {
        if (topic) {
          const history = this.topicHistories.get(topic);
          return !!history && history.currentIndex < history.commands.length - 1;
        }
        return this.globalIndex < this.globalTimeline.length - 1;
      },
    };
  }
}
