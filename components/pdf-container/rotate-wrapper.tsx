import { HTMLAttributes, ReactNode } from "react"
import { Size } from "@embedpdf/models"
import { Rotate } from "@embedpdf/plugin-rotate/react"

type RotateWrapperProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  enabled: boolean
  children: ReactNode
  pageSize: Size
}

const RotateWrapper = ({ enabled, pageSize, children }: RotateWrapperProps) => {
  if (!enabled) {
    return <div>{children}</div>
  }

  return <Rotate pageSize={pageSize}>{children}</Rotate>
}
export default RotateWrapper
