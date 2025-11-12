"use client"

import { useExportCapability } from "@embedpdf/plugin-export/react"
import { useZoom } from "@embedpdf/plugin-zoom/react"
import { useCallback, useEffect, useState } from "react"
import { useAnnotationCapability } from "./plugin-annotation-2"

// use the capability (not useHistory)
import { useHistoryCapability } from "@embedpdf/plugin-history/react"
import {
  Download,
  Highlighter,
  Redo2,
  Trash2,
  Underline,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

export const Toolbar = () => {
  const { provides: annotationApi } = useAnnotationCapability()
  const { provides: exportApi } = useExportCapability()
  const { provides: zoom } = useZoom()

  const { provides: history } = useHistoryCapability()

  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)

  // local flags for history since this API doesn't hand you .state
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    if (!annotationApi) return
    const unsub1 = annotationApi.onActiveToolChange((tool: any) => setActiveTool(tool?.id ?? null))
    const unsub2 = annotationApi.onStateChange((state: any) => setCanDelete(!!state.selectedUid))
    return () => {
      unsub1()
      unsub2()
    }
  }, [annotationApi])

  // wire up history booleans
  useEffect(() => {
    if (!history) return
    // initialize if fields exist
    setCanUndo(!!(history as any).canUndo)
    setCanRedo(!!(history as any).canRedo)

    const unsub = (history as any).onHistoryChange?.(() => {
      setCanUndo(!!(history as any).canUndo)
      setCanRedo(!!(history as any).canRedo)
    })
    return () => {
      unsub?.()
    }
  }, [history])

  const handleDelete = () => {
    const selection = annotationApi?.getSelectedAnnotation()
    if (selection) {
      annotationApi?.deleteAnnotation(selection.object.pageIndex, selection.object.id)
    }
  }

  // shortcuts
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (!history) return
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === "z" && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault()
          ;(history as any).undo?.()
        }
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        if (canRedo) {
          e.preventDefault()
          ;(history as any).redo?.()
        }
      }
    },
    [history, canUndo, canRedo],
  )

  useEffect(() => {
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onKey])

  const tools = [
    { id: "highlight", active: activeTool === "highlight", icon: Highlighter },
    { id: "underline", active: activeTool === "underline", icon: Underline },
  ]

  return (
    <div className="mt-4 mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => annotationApi?.setActiveTool(activeTool === tool.id ? null : tool.id)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            tool.active ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
          title={tool.id}
        >
          <tool.icon size={18} />
        </button>
      ))}

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={() => zoom?.zoomOut()}
        disabled={!zoom}
        className="rounded-md bg-gray-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        title="Zoom out"
      >
        <ZoomOut size={18} />
      </button>
      <button
        onClick={() => zoom?.zoomIn()}
        disabled={!zoom}
        className="rounded-md bg-gray-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        title="Zoom in"
      >
        <ZoomIn size={18} />
      </button>

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={() => (history as any)?.undo?.()}
        disabled={!canUndo}
        className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        title="Undo (Ctrl/Cmd+Z)"
      >
        <Undo2 size={18} />
      </button>
      <button
        onClick={() => (history as any)?.redo?.()}
        disabled={!canRedo}
        className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        title="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)"
      >
        <Redo2 size={18} />
      </button>

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={() => annotationApi?.exportAnnotationsToJSON?.()}
        className="rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        title="Export JSON"
      >
        Export JSON
      </button>
      <button
        onClick={() => exportApi?.download()}
        disabled={!exportApi}
        className="rounded-md bg-green-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-300"
        title="Download"
      >
        <Download size={18} />
      </button>
      <button
        onClick={handleDelete}
        disabled={!canDelete}
        className="rounded-md bg-red-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
        title="Delete selected"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}
