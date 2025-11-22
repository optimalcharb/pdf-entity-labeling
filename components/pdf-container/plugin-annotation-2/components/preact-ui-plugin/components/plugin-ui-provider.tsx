import { ReactNode } from '@framework';
import { useUICapability } from '../hooks';
import { ComponentWrapper } from './component-wrapper';
import { UIComponent } from '@embedpdf/plugin-ui';

/**
 * Interface for UI components organized by type/location
 */
export interface UIComponentsMap {
  headers: {
    top: ReactNode[];
    bottom: ReactNode[];
    left: ReactNode[];
    right: ReactNode[];
  };
  panels: {
    left: ReactNode[];
    right: ReactNode[];
  };
  floating: {
    insideScroller: ReactNode[];
    outsideScroller: ReactNode[];
  };
  commandMenu: ReactNode | null;
}

/**
 * Props for the PluginUIProvider
 */
export interface PluginUIProviderProps {
  /**
   * Render function that receives UI components
   */
  children: (components: UIComponentsMap) => ReactNode;
}

/**
 * PluginUIProvider collects all components from the UI plugin system
 * and provides them to a render function without imposing any structure.
 *
 * It uses the render props pattern for maximum flexibility.
 */
export function PluginUIProvider({ children }: PluginUIProviderProps) {
  const { provides: uiProvides } = useUICapability();

  // Helper function to wrap UIComponents as JSX elements
  const wrapComponents = (components: UIComponent<any>[]): ReactNode[] => {
    return components.map((component) => (
      <ComponentWrapper key={component.props.id} component={component} />
    ));
  };

  // Collect and wrap all components from UI plugin
  const componentMap: UIComponentsMap = {
    headers: {
      top: wrapComponents(uiProvides?.getHeadersByPlacement('top') || []),
      bottom: wrapComponents(uiProvides?.getHeadersByPlacement('bottom') || []),
      left: wrapComponents(uiProvides?.getHeadersByPlacement('left') || []),
      right: wrapComponents(uiProvides?.getHeadersByPlacement('right') || []),
    },
    panels: {
      left: wrapComponents(uiProvides?.getPanelsByLocation('left') || []),
      right: wrapComponents(uiProvides?.getPanelsByLocation('right') || []),
    },
    floating: {
      insideScroller: wrapComponents(uiProvides?.getFloatingComponents('inside') || []),
      outsideScroller: wrapComponents(uiProvides?.getFloatingComponents('outside') || []),
    },
    commandMenu: uiProvides?.getCommandMenu() ? (
      <ComponentWrapper component={uiProvides.getCommandMenu()!} />
    ) : null,
  };

  // Let the consumer determine the layout structure through the render prop
  return children(componentMap);
}
