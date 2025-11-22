import { MessageSquare, Palette, Trash2 } from "lucide-react"
import { useAnnotationCapability } from "../../hooks"
import { SelectionMenuProps } from "../selection-menu"

export const AnnotationMenu = ({ annotation, menuWrapperProps, selected }: SelectionMenuProps) => {
  const { provides: annotationCapability } = useAnnotationCapability()

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    annotationCapability?.deleteAnnotation(annotation.object.id)
  }

  const handleStyleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Placeholder for style panel toggle
    console.log("Toggle style panel")
  }

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Placeholder for comment panel toggle
    console.log("Toggle comment panel")
  }

  if (!selected) return null

  return (
    <div
      {...menuWrapperProps}
      style={{
        ...menuWrapperProps.style,
        display: "flex",
        justifyContent: "center",
      }}
      data-testid="annotation-menu"
    >
      <div
        className="flex flex-row gap-1 rounded-md border border-[#cfd4da] bg-[#f8f9fa] p-1 shadow-sm"
        style={{
          pointerEvents: "auto",
          position: "absolute",
          top: "100%",
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
        <button
          onClick={handleCommentClick}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-200"
          title="Comment"
        >
          <MessageSquare size={20} />
        </button>
        <button
          onClick={handleStyleClick}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-200"
          title="Style"
        >
          <Palette size={20} />
        </button>
      </div>
    </div>
  )
}
