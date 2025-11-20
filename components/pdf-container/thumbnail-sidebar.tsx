import usePluginStore from "@/components/plugin-store/hooks/use-plugin-store"
import { ThumbImg, ThumbnailsPane } from "@embedpdf/plugin-thumbnail/react"

const ThumbnailSidebar = () => {
  const { scrollCapability } = usePluginStore()

  return (
    <div
      style={{
        width: "150px",
        height: "100%",
        backgroundColor: "#f8f9fa",
        borderRight: "1px solid #dee2e6",
      }}
    >
      <ThumbnailsPane>
        {(m) => {
          const isActive = state.currentPage === m.pageIndex + 1
          return (
            <div
              key={m.pageIndex}
              style={{
                position: "absolute",
                width: "100%",
                height: m.wrapperHeight,
                top: m.top,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                padding: "4px",
              }}
              onClick={() => {
                scrollCapability?.scrollToPage?.({
                  pageNumber: m.pageIndex + 1,
                })
              }}
            >
              {/* Thumbnail image container */}
              <div
                style={{
                  width: m.width,
                  height: m.height,
                  border: `2px solid ${isActive ? "#0d6efd" : "#ced4da"}`,
                  borderRadius: "4px",
                  overflow: "hidden",
                  boxShadow: isActive ? "0 0 5px rgba(13, 110, 253, 0.5)" : "none",
                }}
              >
                <ThumbImg
                  meta={m}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
              {/* Page number label */}
              <div
                style={{
                  height: m.labelHeight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "4px",
                }}
              >
                <span style={{ fontSize: "12px", color: "#6c757d" }}>{m.pageIndex + 1}</span>
              </div>
            </div>
          )
        }}
      </ThumbnailsPane>
    </div>
  )
}

export default ThumbnailSidebar
