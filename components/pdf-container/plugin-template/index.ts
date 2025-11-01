import {
  Action,
  BasePlugin,
  BasePluginConfig,
  type PluginManifest,
  PluginPackage,
  PluginRegistry,
  type Reducer,
  useCapability,
  usePlugin,
} from "../core"
// import React, { Fragment, useCallback, useEffect, useState } from "react"
// import { jsx, jsxs } from "react/jsx-runtime"

// template to create a plugin
// replace all occurances of "template" with the plugin name
// MUST use these comments to define sections in this order

// *****CUSTOM TYPES******
// ***EVENTS***
// optional

// ***OTHER CUSTOM TYPES***
// optional

// *****PLUGIN ESSENTIALS******
// ***ID***
export const TEMPLATE_PLUGIN_ID = "template"

// ***STATE***
export interface TemplateState {}

// ***INITIAL STATE***
const initialState: TemplateState = {}

// ***ACTION CONSTANTS***
const NAME = "TEMPLATE/NAME"
// example: SET_ANNOTATION = "ANNOTATION/SET_ANNOTATION"

// ***ACTION INTERFACES***
interface NameAction extends Action {
  type: typeof NAME
  payload: {}
}

// ***ACTION UNION***
export type TemplateAction = NameAction

// ***ACTION CREATORS***
const name = () => ({
  type: NAME,
  payload: {},
})

// ***ACTION REDUCER***
const reducer: Reducer<TemplateState, TemplateAction> = (
  state: TemplateState,
  action: TemplateAction,
) => {
  switch (action.type) {
    case NAME: {
      return state
    }
    default:
      return state
  }
}

// ***PLUGIN CAPABILITY***
export interface TemplateCapability {}

// ***PLUGIN CONFIG***
export interface TemplatePluginConfig extends BasePluginConfig {}

// ***PLUGIN CLASS***
export class TemplatePlugin extends BasePlugin<
  TemplatePluginConfig,
  TemplateCapability,
  TemplateState,
  TemplateAction
> {
  static readonly id: string = TEMPLATE_PLUGIN_ID

  constructor(id: string, registry: PluginRegistry, config: TemplatePluginConfig) {
    super(id, registry)
  }

  async initialize() {}

  // capabilitiy functions to enable the client program to...
  buildCapability(): TemplateCapability {
    return {
      capabilitiy0: () => this.capability0(),
    }
  }

  capability0() {}
}

// ***MANIFEST***
const manifest: PluginManifest<TemplatePluginConfig> = {
  id: TEMPLATE_PLUGIN_ID,
  name: "Template Plugin",
  version: "1.0.0",
  provides: [TEMPLATE_PLUGIN_ID],
  requires: [],
  optional: [],
  defaultConfig: {},
}

// ***PLUGIN PACKAGE***
export const TemplatePluginPackage: PluginPackage<
  TemplatePlugin,
  TemplatePluginConfig,
  TemplateState,
  TemplateAction
> = {
  manifest,
  create: (registry: PluginRegistry, config: TemplatePluginConfig) =>
    new TemplatePlugin(TEMPLATE_PLUGIN_ID, registry, config),
  reducer,
  initialState,
}

// ***PLUGIN HOOKS***
export const useTemplatePlugin = () => usePlugin(TEMPLATE_PLUGIN_ID)
export const useTemplateCapability = () => useCapability(TEMPLATE_PLUGIN_ID)

// *****HELPER FUNCTIONS*****
// optional

// *****COMPONENTS******
// optional

// *****CUSTOM HOOKS*****
// optional
