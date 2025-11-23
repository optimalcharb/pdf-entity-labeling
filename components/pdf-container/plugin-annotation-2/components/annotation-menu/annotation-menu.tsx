import { Trash2 } from "lucide-react"
import { useAnnotationCapability } from "../../hooks"
import { SelectionMenu, SelectionMenuProps } from "../selection-menu"

export const AnnotationMenu: SelectionMenu = ({
  annotation,
  menuWrapperProps,
  selected,
  rect,
}: SelectionMenuProps) => {
  const { provides: annotationCapability } = useAnnotationCapability()

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
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
