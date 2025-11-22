import { AnnotationLayer } from "@embedpdf/plugin-annotation/preact"
import { AnnotationMenu } from "./ex-preact-annotation-menu"
// put inside EmbedPDF
;<AnnotationLayer
  pageIndex={pageIndex}
  scale={scale}
  pageWidth={width}
  pageHeight={height}
  rotation={rotation}
  selectionMenu={({ selected, rect, annotation, menuWrapperProps }) => (
    <div
      {...menuWrapperProps}
      style={{
        ...menuWrapperProps.style,
        display: "flex",
        justifyContent: "center",
      }}
    >
      {selected ? (
        <AnnotationMenu
          trackedAnnotation={annotation}
          style={{
            pointerEvents: "auto",
            position: "absolute",
            top: rect.size.height + 10,
          }}
        />
      ) : null}
    </div>
  )}
/>
