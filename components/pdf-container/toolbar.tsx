import { PdfAnnotationSubtype } from "@embedpdf/models"
import { useExportCapability } from "@embedpdf/plugin-export/react"
import { useRotateCapability } from "@embedpdf/plugin-rotate/react"
import { useZoomCapability } from "@embedpdf/plugin-zoom/react"
import {
  Download,
  Highlighter,
  Redo2,
  RotateCcw,
  RotateCw,
  Trash2,
  Underline,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import usePluginStore from "../plugin-store/hooks/use-plugin-store"
import type { PdfTextMarkupAnnotationObject, Subtype } from "./plugin-annotation-2"

const Toolbar = ({ canRotate }: { canRotate: boolean }) => {
  const { provides: exportCapability } = useExportCapability()
  const { provides: zoomCapability } = useZoomCapability()
  const { provides: rotateCapability } = useRotateCapability()

  const { annoCapability, annoState } = usePluginStore()

  const handleDelete = () => {
    if (annoState?.selectedUid) {
      annoCapability?.deleteAnnotation(annoState.selectedUid)
    }
  }

  const tools = [
    {
      id: "highlight",
      subtype: "highlight" as Subtype,
      icon: Highlighter,
      opacity: 0.5,
      color: "#FBB338",
    },
    {
      id: "underline",
      subtype: "underline" as Subtype,
      icon: Underline,
      opacity: 1,
      color: "#F51F1F",
    },
  ]

  return (
    <div className="mt-4 mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            if (annoState?.activeSubtype !== tool.subtype) {
              annoCapability?.setCreateAnnotationDefaults({
                subtype: tool.subtype,
                opacity: tool.opacity,
                color: tool.color,
              })
            } else {
              annoCapability?.setCreateAnnotationDefaults({
                subtype: null,
              })
            }
          }}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            tool.subtype === annoState?.activeSubtype
              ? "bg-blue-500 text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
          title={tool.id}
        >
          <tool.icon size={18} />
        </button>
      ))}

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={() => zoomCapability?.zoomOut()}
        disabled={!zoomCapability}
        className="rounded-md bg-gray-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        title="Zoom out"
      >
        <ZoomOut size={18} />
      </button>
      <button
        onClick={() => zoomCapability?.zoomIn()}
        disabled={!zoomCapability}
        className="rounded-md bg-gray-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        title="Zoom in"
      >
        <ZoomIn size={18} />
      </button>

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={() => annoCapability?.undo()}
        disabled={!annoState?.canUndo}
        className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        title="Undo"
      >
        <Undo2 size={18} />
      </button>
      <button
        onClick={() => annoCapability?.redo()}
        disabled={!annoState?.canRedo}
        className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        title="Redo"
      >
        <Redo2 size={18} />
      </button>

      <div className="h-6 w-px bg-gray-200" />
      {canRotate && (
        <>
          <button
            onClick={() => rotateCapability?.rotateBackward()}
            disabled={!rotateCapability}
            className="rounded-md bg-gray-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            title="Rotate Counter Clockwise"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => rotateCapability?.rotateForward()}
            disabled={!rotateCapability}
            className="rounded-md bg-gray-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            title="Rotate Clockwise"
          >
            <RotateCw size={18} />
          </button>
        </>
      )}
      <button
        onClick={() => annoCapability?.exportAnnotationsToJSON?.()}
        className="rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        title="Export Annotations to JSON"
      >
        Export JSON
      </button>
      <button
        onClick={() => exportCapability?.download()}
        disabled={!exportCapability}
        className="rounded-md bg-green-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-300"
        title="Download Annotated PDF"
      >
        <Download size={18} />
      </button>
      <button
        onClick={handleDelete}
        disabled={!annoState?.selectedUid}
        className="rounded-md bg-red-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
        title="Delete Selected Annotation"
      >
        <Trash2 size={18} />
      </button>
      <button
        onClick={() => annoCapability?.clearAnnotations()}
        className="rounded-md bg-red-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-600"
        title="Clear All Annotations"
      >
        Clear All
      </button>
      <button
        onClick={() => {
          let patch: Partial<PdfTextMarkupAnnotationObject> = {}
          patch.color = "red"
          patch.opacity = 0.5
          patch.type = PdfAnnotationSubtype.HIGHLIGHT
          if (!annoState) return
          if (!annoState.byUid) return
          const allAnnoUids = Object.keys(annoState.byUid)
          annoCapability?.updateAnnotations(allAnnoUids.map((id: string) => ({ id, patch })))
        }}
        className="rounded-md bg-red-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
        title="Turn all annotations into red highlights"
      >
        Red Highlights
      </button>
    </div>
  )
}
export default Toolbar
