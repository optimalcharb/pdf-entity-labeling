import { PluginRegistry } from '@embedpdf/core';

export type Dynamic<TStore, T> = T | ((state: TStore) => T);

export type IconProps = {
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
  title?: string;
};

export interface MenuItemBase<TStore = any> {
  icon?: Dynamic<TStore, string>;
  iconProps?: Dynamic<TStore, IconProps>;
  label: Dynamic<TStore, string>;
  active?: Dynamic<TStore, boolean>; // whether command is currently active
  disabled?: Dynamic<TStore, boolean>; // whether command is currently disabled
  shortcut?: string; // "Ctrl+Plus"
  shortcutLabel?: string; // "Ctrl+Plus"
  visible?: Dynamic<TStore, boolean>; // whether command should be visible
  dividerBefore?: boolean; // whether to add a divider before the command
}

export interface Action<TStore = any> extends MenuItemBase<TStore> {
  id: string; // "zoomIn"
  type: 'action'; // i18n key or literal
  action: (registry: PluginRegistry, state: TStore) => void; // executed onClick                             // whether to add a divider before the command
}

export interface Group<TStore = any> {
  id: string;
  type: 'group';
  label: Dynamic<TStore, string>;
  children: string[];
}

export interface Menu<TStore = any> extends MenuItemBase<TStore> {
  id: string;
  type: 'menu';
  children: string[];
}

export type MenuItem<TStore = any> = Action<TStore> | Group | Menu<TStore>;

export type MenuRegistry = Record<string, MenuItem>;

// Options for executing an action
export interface ExecuteOptions {
  source?: 'click' | 'shortcut' | 'api';
  triggerElement?: HTMLElement;
  flatten?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function hasActive<TStore>(command: MenuItem<TStore>): command is Action<TStore> {
  return 'active' in command;
}

export interface MenuManagerCapabilities {
  registerItem: (commandItem: MenuItem) => void;
  registerItems: (commands: MenuRegistry) => void;
  executeCommand: (id: string, options?: ExecuteOptions) => void;
  getAction: (id: string) => ResolvedAction | undefined;
  getMenuOrAction: (id: string) => ResolvedMenu | ResolvedAction | undefined;
  getChildItems: (commandId: string, options?: { flatten?: boolean }) => ResolvedMenuItem[];
  getItemsByIds: (ids: string[]) => ResolvedMenuItem[];
  getAllItems: () => MenuRegistry;
}

// Add these new resolved types after the existing interfaces
export type Resolved<TStore, T> = T extends Dynamic<TStore, infer U> ? U : T;

export interface ResolvedMenuItemBase<TStore = any> {
  icon?: string;
  iconProps?: IconProps;
  label: string;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  shortcutLabel?: string;
  visible?: boolean;
  dividerBefore?: boolean;
}

export interface ResolvedAction<TStore = any> extends ResolvedMenuItemBase<TStore> {
  id: string;
  type: 'action';
  action: (registry: PluginRegistry, state: TStore) => void;
}

export interface ResolvedGroup<TStore = any> {
  id: string;
  type: 'group';
  label: string;
  children: string[];
}

export interface ResolvedMenu<TStore = any> extends ResolvedMenuItemBase<TStore> {
  id: string;
  type: 'menu';
  children: string[];
}

export type ResolvedMenuItem<TStore = any> =
  | ResolvedAction<TStore>
  | ResolvedGroup<TStore>
  | ResolvedMenu<TStore>;

// Result of menu item resolution
export interface ResolvedMenuItemResult<TStore = any> {
  item: ResolvedMenuItem<TStore>;
  isGroup: boolean;
  isMenu: boolean;
  isAction: boolean;
}
