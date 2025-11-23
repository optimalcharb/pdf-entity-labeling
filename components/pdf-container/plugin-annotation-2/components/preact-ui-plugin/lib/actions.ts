import { Action } from "@embedpdf/core"
import { UIPluginState } from "./types"

export const UI_INIT_COMPONENTS = "UI_INIT_COMPONENTS"
export const UI_INIT_FLYOUT = "UI_INIT_FLYOUT"
export const UI_TOGGLE_FLYOUT = "UI_TOGGLE_FLYOUT"
export const UI_SET_HEADER_VISIBLE = "UI_SET_HEADER_VISIBLE"
export const UI_TOGGLE_PANEL = "UI_TOGGLE_PANEL"
export const UI_SHOW_COMMAND_MENU = "UI_SHOW_COMMAND_MENU"
export const UI_HIDE_COMMAND_MENU = "UI_HIDE_COMMAND_MENU"
export const UI_UPDATE_COMMAND_MENU = "UI_UPDATE_COMMAND_MENU"
export const UI_UPDATE_COMPONENT_STATE = "UI_UPDATE_COMPONENT_STATE"

export interface InitFlyoutPayload {
  id: string
  triggerElement: HTMLElement
}

export interface ToggleFlyoutPayload {
  id: string
  open?: boolean
}

export interface SetHeaderVisiblePayload {
  id: string
  visible: boolean
  visibleChild?: string
}

export interface TogglePanelPayload {
  id: string
  open?: boolean
  visibleChild: string
}

export interface ShowCommandMenuPayload {
  id: string
  commandId: string
  triggerElement?: HTMLElement
  position?: "top" | "bottom" | "left" | "right"
  flatten?: boolean
}

export interface UpdateComponentStatePayload<T = any> {
  /** one of the top-level keys inside UIPluginState, e.g. "panel" | "custom" … */
  componentType: keyof UIPluginState
  /** same id you used when registering the component */
  componentId: string
  /** partial patch – only keys existing in the current state will be applied */
  patch: Partial<T>
}

export interface HideCommandMenuPayload {
  id: string
}

export interface UiInitComponentsAction extends Action {
  type: typeof UI_INIT_COMPONENTS
  payload: UIPluginState
}

export interface UiInitFlyoutAction extends Action {
  type: typeof UI_INIT_FLYOUT
  payload: InitFlyoutPayload
}

export interface UiToggleFlyoutAction extends Action {
  type: typeof UI_TOGGLE_FLYOUT
  payload: ToggleFlyoutPayload
}

export interface UiSetHeaderVisibleAction extends Action {
  type: typeof UI_SET_HEADER_VISIBLE
  payload: SetHeaderVisiblePayload
}

export interface UiTogglePanelAction extends Action {
  type: typeof UI_TOGGLE_PANEL
  payload: TogglePanelPayload
}

export interface UiShowCommandMenuAction extends Action {
  type: typeof UI_SHOW_COMMAND_MENU
  payload: ShowCommandMenuPayload
}

export interface UiHideCommandMenuAction extends Action {
  type: typeof UI_HIDE_COMMAND_MENU
  payload: HideCommandMenuPayload
}

export interface UiUpdateComponentStateAction extends Action {
  type: typeof UI_UPDATE_COMPONENT_STATE
  payload: UpdateComponentStatePayload
}

export type UIPluginAction =
  | UiInitComponentsAction
  | UiInitFlyoutAction
  | UiToggleFlyoutAction
  | UiSetHeaderVisibleAction
  | UiTogglePanelAction
  | UiShowCommandMenuAction
  | UiHideCommandMenuAction
  | UiUpdateComponentStateAction

export const uiInitComponents = (state: UIPluginState): UiInitComponentsAction => ({
  type: UI_INIT_COMPONENTS,
  payload: state,
})

export const uiInitFlyout = (payload: InitFlyoutPayload): UiInitFlyoutAction => ({
  type: UI_INIT_FLYOUT,
  payload,
})

export const uiToggleFlyout = (payload: ToggleFlyoutPayload): UiToggleFlyoutAction => ({
  type: UI_TOGGLE_FLYOUT,
  payload,
})

export const uiTogglePanel = (payload: TogglePanelPayload): UiTogglePanelAction => ({
  type: UI_TOGGLE_PANEL,
  payload,
})

export const uiSetHeaderVisible = (payload: SetHeaderVisiblePayload): UiSetHeaderVisibleAction => ({
  type: UI_SET_HEADER_VISIBLE,
  payload,
})

export const uiShowCommandMenu = (payload: ShowCommandMenuPayload): UiShowCommandMenuAction => ({
  type: UI_SHOW_COMMAND_MENU,
  payload,
})

export const uiHideCommandMenu = (payload: HideCommandMenuPayload): UiHideCommandMenuAction => ({
  type: UI_HIDE_COMMAND_MENU,
  payload,
})

export const uiUpdateComponentState = <T>(
  payload: UpdateComponentStatePayload<T>,
): UiUpdateComponentStateAction => ({
  type: UI_UPDATE_COMPONENT_STATE,
  payload,
})
