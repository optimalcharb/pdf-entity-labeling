import { useEffect, useState } from "preact/hooks"
import { UIComponent, childrenFunctionOptions } from "../lib"

export function ComponentWrapper({
  component,
  parentContext = {},
}: {
  component: UIComponent<any>
  parentContext?: Record<string, any>
}) {
  const [_, forceUpdate] = useState({})

  useEffect(() => {
    const updateCallback = () => forceUpdate({})
    // If the component had updated before we attach the listener, force one re-render
    if (component.onUpdate(updateCallback)) {
      forceUpdate({})
    }
    return () => component.offUpdate(updateCallback)
  }, [component])

  // Merge contexts from parent + the UIComponent's own child context
  const childContext = component.getChildContext(parentContext)

  // Instead of returning `component.render()`, we do the following:

  // 1) Look up the "renderer function" for this component type
  const renderer = component.getRenderer() // We'll define getRenderer() below

  if (!renderer) {
    throw new Error(`No renderer for type: ${component.getRenderType}`)
  }

  // 2) Build a function that returns child wrappers
  function renderChildrenFn(options?: childrenFunctionOptions) {
    const merged = options?.context ? { ...childContext, ...options.context } : childContext
    return component
      .getChildren()
      .filter(({ id }) => {
        // If filter function is provided, use it to determine if we should include this child
        return !options?.filter || options.filter(id)
      })
      .map(({ component: child, id, className }) =>
        className ? (
          <div className={className}>
            <ComponentWrapper key={id} component={child} parentContext={merged} />
          </div>
        ) : (
          <ComponentWrapper key={id} component={child} parentContext={merged} />
        ),
      )
  }

  // 3) Finally call the renderer with (props, childrenFn, context)
  return renderer(component.props, renderChildrenFn, childContext)
}
