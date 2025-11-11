import { useEffect, useState } from "react"
import { useAnnotationCapability } from "./plugin-annotation-2"
import { useExportCapability } from "@embedpdf/plugin-export/react"

export const AnnotationToolbar = () => {
  const { provides: annotationApi } = useAnnotationCapability()
  const { provides: exportApi } = useExportCapability()
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)

  useEffect(() => {
    if (!annotationApi) return

    const unsub1 = annotationApi.onActiveToolChange((tool) => {
      setActiveTool(tool?.id ?? null)
    })
    const unsub2 = annotationApi.onStateChange((state) => {
      setCanDelete(!!state.selectedUid)
    })

    return () => {
      unsub1()
      unsub2()
    }
  }, [annotationApi])

  const handleDelete = () => {
    const selection = annotationApi?.getSelectedAnnotation()
    if (selection) {
      annotationApi?.deleteAnnotation(selection.object.pageIndex, selection.object.id)
    }
  }

  const tools = [
    { id: "highlight", active: activeTool === "highlight" },
    { id: "underline", active: activeTool === "underline" },
    { id: "squiggly", active: activeTool === "squiggly" },
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
        >
          {tool.id}
        </button>
      ))}
      <div className="h-6 w-px bg-gray-200"></div>
      <button
        onClick={() => annotationApi?.exportAnnotationsToJSON()}
        className="rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600"
      >
        Export JSON
      </button>
      <button
        onClick={() => exportApi?.download()}
        disabled={!exportApi}
        className="rounded-md bg-green-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-300"
      >
        Download PDF
      </button>
      <button
        onClick={handleDelete}
        disabled={!canDelete}
        className="rounded-md bg-red-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
      >
        Delete Selected
      </button>
    </div>
  )
}
