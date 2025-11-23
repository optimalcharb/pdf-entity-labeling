import { BaseUIComponent, childrenFunctionOptions } from "./types"

export class UIComponent<T extends BaseUIComponent<any, any, any>> {
  public componentConfig: T
  public props: T["id"] extends string
    ? T extends BaseUIComponent<infer P, any, any>
      ? P & { id: string }
      : any
    : any
  public type: string
  private children: Array<{
    id: string
    component: UIComponent<any>
    priority: number
    className?: string
  }> = []
  private registry: Record<
    string,
    (
      props: any,
      children: (options?: childrenFunctionOptions) => any[],
      context?: Record<string, any>,
    ) => any
  >
  private updateCallbacks: (() => void)[] = []
  private hadUpdateBeforeListeners = false

  constructor(
    componentConfig: T,
    registry: Record<
      string,
      (
        props: any,
        children: (options?: childrenFunctionOptions) => any[],
        context?: Record<string, any>,
      ) => any
    >,
  ) {
    this.componentConfig = componentConfig

    const props = componentConfig.props || {}

    if (typeof props === "function") {
      const initialProps = props(componentConfig.initialState)
      this.props = { ...initialProps, id: componentConfig.id }
    } else {
      this.props = { ...props, id: componentConfig.id }
    }

    this.type = componentConfig.type
    this.registry = registry
  }

  addChild(id: string, child: UIComponent<any>, priority: number = 0, className?: string) {
    this.children.push({ id, component: child, priority, className })
    // Sort children by priority
    this.sortChildren()
  }

  // Helper to sort children by priority
  private sortChildren() {
    this.children.sort((a, b) => a.priority - b.priority)
  }

  removeChild(child: UIComponent<any>) {
    this.children = this.children.filter((c) => c.component !== child)
  }

  clearChildren() {
    this.children = []
  }

  get getRenderType() {
    return this.componentConfig.render || this.type
  }

  public getRenderer() {
    return this.registry[this.getRenderType]
  }

  public getChildren() {
    return this.children
  }

  // Optionally, a component can provide a function to extend the context for its children.
  // For instance, a header could supply a "direction" based on its position.
  public getChildContext(context: Record<string, any>): Record<string, any> {
    const childContextProp = this.componentConfig.getChildContext
    if (typeof childContextProp === "function") {
      // Handle function case (existing behavior)
      return { ...context, ...childContextProp(this.props) }
    } else if (childContextProp && typeof childContextProp === "object") {
      // Handle object case
      return { ...context, ...childContextProp }
    }
    return context
  }

  update(newProps: Partial<T extends BaseUIComponent<infer P, any, any> ? P : any>) {
    const { id, ...otherProps } = newProps
    this.props = { ...this.props, ...otherProps }
    if (this.updateCallbacks.length === 0) {
      this.hadUpdateBeforeListeners = true
    }
    this.notifyUpdate()
  }

  onUpdate(callback: () => void) {
    this.updateCallbacks.push(callback)
    return this.hadUpdateBeforeListeners
  }

  offUpdate(callback: () => void) {
    this.updateCallbacks = this.updateCallbacks.filter((cb) => cb !== callback)
  }

  protected notifyUpdate() {
    this.updateCallbacks.forEach((cb) => cb())
  }
}
