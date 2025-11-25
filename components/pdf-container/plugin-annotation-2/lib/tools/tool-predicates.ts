import type { AnnotationTool } from "./annotation-tool"
import { initialTools } from "./initial-tools"

// Infer the exact union type of all tool objects.
type DefaultTool = (typeof initialTools)[number]

// Create a map from a tool's ID to its specific type.
type ToolMap = {
  [T in DefaultTool as T["id"]]: T
}

/**
 * A factory that creates a type-safe predicate function for a specific tool ID.
 * This is more reliable for TypeScript's type inference than a single generic function.
 */
function createToolPredicate<K extends keyof ToolMap>(id: K) {
  // This function returns ANOTHER function, which is the actual type predicate.
  return (tool: AnnotationTool | undefined): tool is ToolMap[K] => {
    return tool?.id === id
  }
}

// Export the generated predicates
export const isHighlightTool = createToolPredicate("highlight")
export const isSquigglyTool = createToolPredicate("squiggly")
export const isUnderlineTool = createToolPredicate("underline")
export const isStrikeoutTool = createToolPredicate("strikeout")
