import { PluginPackage } from '@embedpdf/core';
import { manifest, HISTORY_PLUGIN_ID } from './manifest';
import { HistoryPluginConfig, HistoryState } from './types';
import { HistoryPlugin } from './history-plugin';
import { initialState, reducer } from './reducer';
import { HistoryAction } from './actions';

export const HistoryPluginPackage: PluginPackage<
  HistoryPlugin,
  HistoryPluginConfig,
  HistoryState,
  HistoryAction
> = {
  manifest,
  create: (registry) => new HistoryPlugin(HISTORY_PLUGIN_ID, registry),
  reducer,
  initialState,
};

export * from './history-plugin';
export * from './types';
export * from './manifest';
