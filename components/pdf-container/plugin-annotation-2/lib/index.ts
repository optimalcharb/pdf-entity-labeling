import { PluginPackage } from '@embedpdf/core';
import { AnnotationAction } from './actions';
import { AnnotationPlugin } from './annotation-plugin';
import { ANNOTATION_PLUGIN_ID, manifest } from './manifest';
import { initialState, reducer } from './reducer';
import { AnnotationPluginConfig, AnnotationState } from './types';

export const AnnotationPluginPackage: PluginPackage<
  AnnotationPlugin,
  AnnotationPluginConfig,
  AnnotationState,
  AnnotationAction
> = {
  manifest,
  create: (registry, config) => new AnnotationPlugin(ANNOTATION_PLUGIN_ID, registry, config),
  reducer,
  initialState: (_, config) => initialState(config),
};

export * from './annotation-plugin';
export * from './handlers/types';
export * from './helpers';
export * from './manifest';
export * as patching from './patching/index';
export { initialState } from './reducer';
export * from './selectors';
export * from './tools/tools-utils';
export * from './tools/types';
export * from './types';

