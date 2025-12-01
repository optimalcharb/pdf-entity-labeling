import { Rect } from "@embedpdf/models"
import type { MenuWrapperProps } from "@embedpdf/utils/react"
import { Trash2 } from "lucide-react"
import { useAnnotationCapability } from "../../hooks"
import type { TrackedAnnotation } from "../../lib"

interface SelectedMenuProps {
  annotation: TrackedAnnotation
  selected: boolean
  rect: Rect
  menuWrapperProps: MenuWrapperProps
}

export const AnnotationMenu = ({
  annotation,
  menuWrapperProps,
  selected,
  rect,
}: SelectedMenuProps) => {
  const { provides: annotationCapability } = useAnnotationCapability()

  const handleDeleteClick = () => {
    annotationCapability?.deleteAnnotation(annotation.object.id)
  }

  if (!selected) return null

  return (
    <div {...menuWrapperProps} data-testid="annotation-menu">
      <div
        className="flex flex-row gap-1 rounded-md border border-[#cfd4da] bg-[#f8f9fa] p-1 shadow-sm"
        style={{
          pointerEvents: "auto",
          position: "absolute",
          top: rect.size.height,
          left: rect.size.width / 2,
          transform: "translateX(-50%)",
          marginTop: "3px",
        }}
      >
        <button
          onClick={handleDeleteClick}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-200"
          title="Delete"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  )
}
