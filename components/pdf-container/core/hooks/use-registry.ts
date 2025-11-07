import { useContext } from "react"
import { PDFContext, PDFContextState } from "../context"

/**
 * Hook to access the PDF registry.
 * @returns The PDF registry or null during initialization
 */
export function useRegistry(): PDFContextState {
  const contextValue = useContext(PDFContext)

  // Error if used outside of context
  if (contextValue === undefined) {
    throw new Error("useCapability must be used within a PDFContext.Provider")
  }

  const { registry, isInitializing } = contextValue

  // During initialization, return null instead of throwing an error
  if (isInitializing) {
    return contextValue
  }

  // At this point, initialization is complete but registry is still null, which is unexpected
  if (registry === null) {
    throw new Error("PDF registry failed to initialize properly")
  }

  return contextValue
}
