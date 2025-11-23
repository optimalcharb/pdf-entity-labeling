import { CSSProperties, HTMLAttributes, ReactNode } from "react"
import { Size } from "@embedpdf/models"
import { Rotate } from "@embedpdf/plugin-rotate/react"

type RotateWrapperProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  enabled: boolean
  children: ReactNode
  pageSize: Size
  style?: CSSProperties
}

const RotateWrapper = ({ enabled, pageSize, style, children }: RotateWrapperProps) => {
  if (!enabled) {
    return <div style={style}>{children}</div>
  }

  return (
    <Rotate pageSize={pageSize} style={style}>
      {children}
    </Rotate>
  )
}
export default RotateWrapper
