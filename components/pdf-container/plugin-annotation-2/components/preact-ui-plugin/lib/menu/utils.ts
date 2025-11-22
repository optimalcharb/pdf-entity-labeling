import { MenuItem, Dynamic, ResolvedMenuItem } from './types';

export function resolveMenuItem<TStore>(
  item: MenuItem<TStore>,
  state: TStore,
): ResolvedMenuItem<TStore> {
  const dyn = <T>(v: Dynamic<TStore, T> | undefined): T | undefined =>
    typeof v === 'function' ? (v as any)(state) : v;

  if (item.type === 'group') {
    return {
      ...item,
      label: dyn(item.label) ?? '',
    };
  }

  // spread keeps unknown keys (e.g. children) intact
  return {
    ...item,
    icon: dyn(item.icon) ?? '',
    iconProps: dyn(item.iconProps) ?? {},
    label: dyn(item.label) ?? '',
    visible: dyn(item.visible) ?? true,
    active: dyn(item.active) ?? false,
    disabled: dyn(item.disabled) ?? false,
  };
}

export function isActive<TStore>(item: MenuItem<TStore>, state: TStore): boolean {
  const resolved = resolveMenuItem(item, state);

  if (resolved.type === 'group') {
    return false;
  }

  return resolved.active ? true : false;
}

export function isVisible<TStore>(item: MenuItem<TStore>, state: TStore): boolean {
  const resolved = resolveMenuItem(item, state);

  if (resolved.type === 'group') {
    return false;
  }

  return resolved.visible ? true : false;
}

export function isDisabled<TStore>(item: MenuItem<TStore>, state: TStore): boolean {
  const resolved = resolveMenuItem(item, state);

  if (resolved.type === 'group') {
    return false;
  }

  return resolved.disabled ? true : false;
}

export function getIconProps<TStore>(item: MenuItem<TStore>, state: TStore): any {
  const resolved = resolveMenuItem(item, state);
  if (resolved.type === 'group') {
    return {};
  }
  return resolved.iconProps ?? {};
}
