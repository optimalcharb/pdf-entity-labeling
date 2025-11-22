import { PluginRegistry } from '@embedpdf/core';
import {
  MenuItem,
  Action,
  ExecuteOptions,
  ResolvedMenuItem,
  MenuRegistry,
  Menu,
  MenuManagerCapabilities,
  ResolvedMenuItemResult,
  ResolvedMenu,
  ResolvedAction,
} from './types';
import { EventCallback, createEventController } from '../utils';
import { resolveMenuItem } from './utils';

/**
 * MenuManager manages a registry of menu items and handles their execution.
 * It also manages keyboard shortcuts and implements responsive behavior.
 */
export class MenuManager {
  private registry: MenuRegistry = {};
  private shortcutMap: Record<string, string> = {}; // maps shortcut to menu item id
  private eventController = createEventController();
  private pluginRegistry: PluginRegistry;

  // Event types
  static readonly EVENTS = {
    COMMAND_EXECUTED: 'menu:command_executed',
    MENU_REQUESTED: 'menu:requested',
    SHORTCUT_EXECUTED: 'menu:shortcut_executed',
  };

  constructor(items: MenuRegistry = {}, pluginRegistry: PluginRegistry) {
    this.pluginRegistry = pluginRegistry;
    this.registerItems(items);
    this.setupKeyboardListeners();
  }

  /**
   * Get the current state of the plugin registry
   */
  private get state() {
    return this.pluginRegistry.getStore().getState();
  }

  /**
   * Register a single menu item
   */
  registerItem(item: MenuItem): void {
    if (this.registry[item.id]) {
      console.warn(`Menu item with ID ${item.id} already exists and will be overwritten`);
    }

    this.registry[item.id] = item;

    if ('shortcut' in item && item.shortcut) {
      this.shortcutMap[this.normalizeShortcut(item.shortcut)] = item.id;
    }
  }

  /**
   * Register multiple menu items at once
   */
  registerItems(items: MenuRegistry): void {
    Object.values(items).forEach((item) => {
      this.registerItem(item);
    });
  }

  /**
   * Resolve a menu item by ID
   */
  public resolve(id: string): ResolvedMenuItem {
    const raw = this.registry[id];
    return resolveMenuItem(raw, this.state);
  }

  /**
   * Get a menu item by ID with type information
   */
  getMenuItem(id: string): ResolvedMenuItemResult | undefined {
    const item = this.resolve(id);
    if (!item) return undefined;

    return {
      item,
      isGroup: item.type === 'group',
      isMenu: item.type === 'menu',
      isAction: item.type === 'action',
    };
  }

  /**
   * Get a action by ID (only returns Action type items)
   */
  getAction(id: string): ResolvedAction | undefined {
    const resolved = this.getMenuItem(id);
    if (!resolved || !resolved.isAction) return undefined;
    return resolved.item as ResolvedAction;
  }

  /**
   * Get menu or action by ID
   */
  getMenuOrAction(id: string): ResolvedMenu | ResolvedAction | undefined {
    const resolved = this.getMenuItem(id);
    if (!resolved) return undefined;
    return resolved.item as ResolvedMenu | ResolvedAction;
  }

  /**
   * Get all registered menu items
   */
  getAllItems(): MenuRegistry {
    return { ...this.registry };
  }

  /**
   * Get menu items by their IDs
   */
  getItemsByIds(ids: string[]): ResolvedMenuItem[] {
    return ids.map((id) => this.resolve(id)).filter((item) => item !== undefined);
  }

  /**
   * Get child items for a given menu ID
   * If flatten is true, it will recursively include submenu children but not groups
   */
  getChildItems(menuId: string, options: { flatten?: boolean } = {}): ResolvedMenuItem[] {
    const item = this.resolve(menuId);
    if (!item || !('children' in item) || !item.children?.length) {
      return [];
    }

    // Get all immediate children
    const children = this.getItemsByIds(item.children);

    // If flatten is false or not specified, return immediate children
    if (!options.flatten) {
      return children;
    }

    // If flatten is true, recursively include menu children
    const flattened: ResolvedMenuItem[] = [];

    for (const child of children) {
      if (child.type === 'group') {
        // For groups, add the group itself but don't flatten its children
        flattened.push(child);
      } else if (child.type === 'menu') {
        // For menus, recursively flatten their children
        const menuChildren = this.getChildItems(child.id, { flatten: true });
        flattened.push(...menuChildren);
      } else {
        // For commands, add them directly
        flattened.push(child);
      }
    }

    return flattened;
  }

  /**
   * Execute a command by ID
   */
  executeCommand(id: string, options: ExecuteOptions = {}): void {
    const resolved = this.getMenuItem(id);
    if (!resolved) {
      console.warn(`Menu item '${id}' not found`);
      return;
    }
    if (resolved.item.type === 'group') {
      console.warn(`Cannot execute group '${id}'`);
      return;
    }

    const { item } = resolved;

    if (item.disabled) {
      console.warn(`Menu item '${id}' is disabled`);
      return;
    }

    if (resolved.isAction) {
      // Execute the command's action
      (item as Action).action(this.pluginRegistry, this.state);
      this.eventController.emit(MenuManager.EVENTS.COMMAND_EXECUTED, {
        command: item,
        source: options.source || 'api',
      });
    } else if ('children' in item && item.children?.length) {
      // Handle submenu
      this.handleSubmenu(item, options);
    }
  }

  /**
   * Execute a command from a keyboard shortcut
   */
  executeShortcut(shortcut: string): boolean {
    const normalizedShortcut = this.normalizeShortcut(shortcut);
    const itemId = this.shortcutMap[normalizedShortcut];

    if (itemId) {
      this.executeCommand(itemId, { source: 'shortcut' });
      this.eventController.emit(MenuManager.EVENTS.SHORTCUT_EXECUTED, {
        shortcut: normalizedShortcut,
        itemId,
      });
      return true;
    }
    return false;
  }

  /**
   * Subscribe to menu events
   */
  on(eventType: string, callback: EventCallback): () => void {
    return this.eventController.on(eventType, callback);
  }

  /**
   * Remove an event subscription
   */
  off(eventType: string, callback: EventCallback): void {
    this.eventController.off(eventType, callback);
  }

  /**
   * Handle a menu item that has children (showing a submenu)
   */
  private handleSubmenu(menuItem: MenuItem, options: ExecuteOptions): void {
    this.eventController.emit(MenuManager.EVENTS.MENU_REQUESTED, {
      menuId: menuItem.id,
      triggerElement: options.triggerElement,
      position: options.position,
      flatten: options.flatten || false,
    });
  }

  /**
   * Set up keyboard listeners for shortcuts
   */
  private setupKeyboardListeners(): void {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if the event target is an input, textarea, or has contentEditable
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const shortcut = this.buildShortcutString(event);
      if (shortcut && this.executeShortcut(shortcut)) {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Convert a KeyboardEvent to a shortcut string
   */
  private buildShortcutString(event: KeyboardEvent): string | null {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.altKey) modifiers.push('Alt');
    if (event.metaKey) modifiers.push('Meta');

    // Only add non-modifier keys
    const key = event.key;
    const isModifier = ['Control', 'Shift', 'Alt', 'Meta'].includes(key);
    if (!isModifier) {
      // Handle special case for uppercase letters
      const displayKey = key.length === 1 ? key.toUpperCase() : key;
      return [...modifiers, displayKey].join('+');
    }

    return null;
  }

  /**
   * Normalize a shortcut string for consistent comparison
   */
  private normalizeShortcut(shortcut: string): string {
    return shortcut
      .split('+')
      .map((part) => part.trim())
      .join('+');
  }

  /**
   * Get capabilities for the MenuManager
   */
  capabilities(): MenuManagerCapabilities {
    return {
      registerItem: this.registerItem.bind(this),
      registerItems: this.registerItems.bind(this),
      executeCommand: this.executeCommand.bind(this),
      getAction: this.getAction.bind(this),
      getMenuOrAction: this.getMenuOrAction.bind(this),
      getChildItems: this.getChildItems.bind(this),
      getItemsByIds: this.getItemsByIds.bind(this),
      getAllItems: this.getAllItems.bind(this),
    };
  }
}
