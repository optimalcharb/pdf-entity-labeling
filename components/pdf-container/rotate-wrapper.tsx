import { HTMLAttributes, ReactNode } from "react"
import { Rotate } from "@embedpdf/plugin-rotate/react"

type RotateWrapperProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  enabled: boolean
  children: ReactNode
  documentId: string
  pageIndex: number
}

const RotateWrapper = ({ enabled, children, documentId, pageIndex }: RotateWrapperProps) => {
  if (!enabled) {
    return <>{children}</>
  }

  return (
    <Rotate documentId={documentId} pageIndex={pageIndex}>
      {children}
    </Rotate>
  )
}
export default RotateWrapper
