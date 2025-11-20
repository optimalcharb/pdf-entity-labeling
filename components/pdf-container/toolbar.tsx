import useAnnotationStore from "@/hooks/annotation-store/use-annotation-store"
import { useExportCapability } from "@embedpdf/plugin-export/react"
import { useZoom } from "@embedpdf/plugin-zoom/react"
import {
  Download,
  Highlighter,
  Images,
  Redo2,
  Trash2,
  Underline,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { useSidebar } from "@/components/shadcn-ui/sidebar"

interface ToolbarProps {
  "data-testid"?: string
}

const Toolbar = ({ "data-testid": dataTestId }: ToolbarProps) => {
  const { provides: exportApi } = useExportCapability()
  const { provides: zoom } = useZoom()
  const { toggleSidebar } = useSidebar()

  const {
    capability: annotationApi,
    activeToolId,
    selectedUid,
    canUndo,
    canRedo,
  } = useAnnotationStore()

  const handleDelete = () => {
    if (selectedUid) {
      annotationApi?.deleteAnnotation(selectedUid)
    }
  }

  const tools = [
    { id: "highlight", icon: Highlighter },
    { id: "underline", icon: Underline },
  ]

  return (
    <div
      className="mt-4 mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
      data-testid={dataTestId}
    >
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            annotationApi?.activateTool(tool.id === activeToolId ? null : tool.id)
          }}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            tool.id === activeToolId ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
          title={tool.id}
        >
          <tool.icon size={18} />
        </button>
      ))}

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={() => toggleSidebar()}
        className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium transition-colors hover:bg-gray-200"
        title="Toggle Thumbnails Sidebar"
      >
        <Images size={18} />
      </button>

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
        onClick={() => annotationApi?.undo()}
        disabled={!canUndo}
        className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        title="Undo"
      >
        <Undo2 size={18} />
      </button>
      <button
        onClick={() => annotationApi?.redo()}
        disabled={!canRedo}
        className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        title="Redo"
      >
        <Redo2 size={18} />
      </button>

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={() => annotationApi?.exportAnnotationsToJSON?.()}
        className="rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        title="Export Annotations to JSON"
      >
        Export JSON
      </button>
      <button
        onClick={() => exportApi?.download()}
        disabled={!exportApi}
        className="rounded-md bg-green-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-300"
        title="Download Annotated PDF"
      >
        <Download size={18} />
      </button>
      <button
        onClick={handleDelete}
        disabled={!selectedUid}
        className="rounded-md bg-red-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
        title="Delete Selected Annotation"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}
export default Toolbar
