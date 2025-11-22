import { PluginPackage } from '@embedpdf/core';
import { UIPlugin } from './ui-plugin';
import { manifest, UI_PLUGIN_ID } from './manifest';
import { UIPluginConfig, UIPluginState } from './types';
import { uiReducer, initialState } from './reducer';
import { UIPluginAction } from './actions';

export const UIPluginPackage: PluginPackage<
  UIPlugin,
  UIPluginConfig,
  UIPluginState,
  UIPluginAction
> = {
  manifest,
  create: (registry, config) => new UIPlugin(UI_PLUGIN_ID, registry, config),
  reducer: uiReducer,
  initialState,
};

export * from './manifest';
export * from './ui-plugin';
export * from './types';
export * from './ui-component';
export * from './utils';
export * from './menu/types';
export * from './menu/utils';
