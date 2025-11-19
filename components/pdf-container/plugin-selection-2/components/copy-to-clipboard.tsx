import { useEffect } from "react"
import { useSelectionCapability } from "../hooks"

export function CopyToClipboard() {
  const { provides: sel } = useSelectionCapability()

  useEffect(() => {
    if (!sel) return
    return sel.onCopyToClipboard((text: string) => {
      navigator.clipboard.writeText(text)
    })
  }, [sel])

  return null
}
