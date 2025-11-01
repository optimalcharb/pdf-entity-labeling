import React, { useEffect, useState } from "react"
import { jsx } from "react/jsx-runtime"
import {
  BasePlugin,
  BasePluginConfig,
  createBehaviorEmitter,
  type EventHook,
  type PluginManifest,
  PluginPackage,
  PluginRegistry,
  type Rotation,
  setRotation,
  type Size,
  useCapability,
  usePlugin,
} from "../core"

// *****CUSTOM TYPES******
export interface GetMatrixOptions {
  w: number
  h: number
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const ROTATE_PLUGIN_ID = "rotate"

// ***STATE***
export interface RotateState {
  rotation: Rotation
}

// ***INITIAL STATE***
const initialState: RotateState = {
  rotation: 0,
}

// **ACTIONS***
// no actions for this plugin

// ***PLUGIN CAPABILITY***
export interface RotateCapability {
  onRotateChange: EventHook<Rotation>
  setRotation(rotation: Rotation): void
  getRotation(): Rotation
  rotateForward(): void
  rotateBackward(): void
}
// ***PLUGIN CONFIG***
export interface RotatePluginConfig extends BasePluginConfig {
  defaultRotation?: Rotation
}

// ***PLUGIN CLASS***
export class RotatePlugin extends BasePlugin<RotatePluginConfig, RotateCapability, RotateState> {
  static readonly id: string = ROTATE_PLUGIN_ID

  private readonly rotate$ = createBehaviorEmitter<Rotation>()

  constructor(id: string, registry: PluginRegistry, cfg: RotatePluginConfig) {
    super(id, registry)
    this.resetReady()
    const rotation = cfg.defaultRotation ?? this.coreState.core.rotation
    this.setRotation(rotation)
    this.markReady()
  }

  async initialize(_config: RotatePluginConfig) {}

  private setRotation(rotation: Rotation) {
    const pages = this.coreState.core.pages
    if (!pages) {
      throw new Error("Pages not loaded")
    }
    this.rotate$.emit(rotation)
    this.dispatchCoreAction(setRotation(rotation))
  }

  private rotateForward() {
    const rotation = getNextRotation(this.coreState.core.rotation)
    this.setRotation(rotation)
  }

  private rotateBackward() {
    const rotation = getPreviousRotation(this.coreState.core.rotation)
    this.setRotation(rotation)
  }

  protected buildCapability(): RotateCapability {
    return {
      onRotateChange: this.rotate$.on,
      setRotation: (rotation: Rotation) => this.setRotation(rotation),
      getRotation: () => this.coreState.core.rotation,
      rotateForward: () => this.rotateForward(),
      rotateBackward: () => this.rotateBackward(),
    }
  }

  getMatrixAsString(options: GetMatrixOptions = { w: 0, h: 0 }): string {
    return getRotationMatrixString(this.coreState.core.rotation, options.w, options.h)
  }

  async destroy() {
    this.rotate$.clear()
    super.destroy()
  }
}

// ***MANIFEST***
const manifest: PluginManifest<RotatePluginConfig> = {
  id: ROTATE_PLUGIN_ID,
  name: "Rotate Plugin",
  version: "1.0.0",
  provides: ["rotate"],
  requires: ["loader"],
  optional: ["spread"],
  defaultConfig: {
    enabled: true,
  },
}

// ***PLUGIN PACKAGE***
export const RotatePluginPackage: PluginPackage<RotatePlugin, RotatePluginConfig, RotateState> = {
  manifest,
  create: (registry: PluginRegistry, config: RotatePluginConfig) =>
    new RotatePlugin(ROTATE_PLUGIN_ID, registry, config),
  reducer: () => initialState,
  initialState,
}

// ***PLUGIN HOOKS***
export const useRotatePlugin = () => usePlugin(ROTATE_PLUGIN_ID)
export const useRotateCapability = () => useCapability(ROTATE_PLUGIN_ID)

// *****HELPER FUNCTIONS*****
function getRotationMatrix(
  rotation: Rotation,
  w: number,
  h: number,
): [number, number, number, number, number, number] {
  let a = 1,
    b = 0,
    c = 0,
    d = 1,
    e = 0,
    f = 0
  switch (rotation) {
    case 1:
      a = 0
      b = 1
      c = -1
      d = 0
      e = h
      break
    case 2:
      a = -1
      b = 0
      c = 0
      d = -1
      e = w
      f = h
      break
    case 3:
      a = 0
      b = -1
      c = 1
      d = 0
      f = w
      break
  }
  return [a, b, c, d, e, f]
}

function getRotationMatrixString(rotation: Rotation, w: number, h: number): string {
  const [a, b, c, d, e, f] = getRotationMatrix(rotation, w, h)
  return `matrix(${a},${b},${c},${d},${e},${f})`
}

function getNextRotation(current: Rotation): Rotation {
  return (((current as number) + 1) % 4) as Rotation
}

function getPreviousRotation(current: Rotation): Rotation {
  return (((current as number) + 3) % 4) as Rotation
}

// *****COMPONENTS******
interface RotateProps {
  children: React.ReactNode
  pageSize: Size
  style?: React.CSSProperties
  [key: string]: any
}

export function Rotate({ children, pageSize, style, ...props }: RotateProps) {
  const plugin = usePlugin(ROTATE_PLUGIN_ID)
  const rotate = (plugin as any)?.plugin as RotatePlugin
  const matrix =
    rotate?.getMatrixAsString({
      w: pageSize.width,
      h: pageSize.height,
    }) || "matrix(1, 0, 0, 1, 0, 0)"

  return /* @__PURE__ */ jsx("div", {
    ...props,
    style: {
      position: "absolute",
      transformOrigin: "0 0",
      transform: matrix,
      ...style,
    },
    children,
  })
}

// *****CUSTOM HOOKS*****
export const useRotate = () => {
  const { provides } = useRotateCapability()
  const [rotation, setRotation] = useState<Rotation>(0)
  useEffect(() => {
    return (provides as any)?.onRotateChange?.((rotation2: Rotation) => setRotation(rotation2))
  }, [provides])
  return {
    rotation,
    provides,
  }
}
