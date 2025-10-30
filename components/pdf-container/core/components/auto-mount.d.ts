import { ReactNode } from "react"
import { IPlugin, PluginBatchRegistration } from "../types"
interface AutoMountProps {
  plugins: PluginBatchRegistration<IPlugin<any>, any>[]
  children: ReactNode
}
export declare function AutoMount({
  plugins,
  children,
}: AutoMountProps): import("react/jsx-runtime").JSX.Element
export {}
