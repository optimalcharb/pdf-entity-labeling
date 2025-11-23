import { CSSProperties, HTMLAttributes, ReactNode, useEffect, useRef } from "react"
import { useInteractionManagerCapability } from "../hooks"
import { createPointerProvider } from "./utils"

interface GlobalPointerProviderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  style?: CSSProperties
}

export const GlobalPointerProvider = ({
  children,
  style,
  ...props
}: GlobalPointerProviderProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const { provides: cap } = useInteractionManagerCapability()

  useEffect(() => {
    if (!cap || !ref.current) return

    return createPointerProvider(cap, { type: "global" }, ref.current)
  }, [cap])

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
