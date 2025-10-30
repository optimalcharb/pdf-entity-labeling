import React, { useEffect, useRef, useState } from "react"
import { jsx } from "react/jsx-runtime"
import {
  Action,
  BasePlugin,
  BasePluginConfig,
  type CoreState,
  createBehaviorEmitter,
  createEmitter,
  type EventHook,
  ignore,
  PdfErrorCode,
  PdfErrorReason,
  type PluginManifest,
  PluginPackage,
  PluginRegistry,
  type Reducer,
  REFRESH_PAGES,
  restoreRect,
  type StoreState,
  type Task,
  transformSize,
  type Unsubscribe,
  useCapability,
  usePlugin,
} from "../core"

// *****CUSTOM TYPES******
export type TileStatus = "queued" | "rendering" | "ready"

export interface Tile {
  status: TileStatus
  screenRect: import("../core").Rect
  pageRect: import("../core").Rect
  isFallback: boolean
  srcScale: number
  col: number
  row: number
  id: string
}

export interface CalculateTilesForPageOptions {
  tileSize?: number
  overlapPx?: number
  extraRings?: number
  scale: number
  rotation: import("../core").Rotation
  page: import("../core").PdfPageObject
  metric: import("../plugin-scroll").PageVisibilityMetrics
}

export interface RenderTileOptions {
  pageIndex: number
  tile: Tile
  dpr: number
}

// *****PLUGIN ESSENTIALS******
// ***ID***
export const TILING_PLUGIN_ID = "tiling"

// ***STATE***
export interface TilingState {
  visibleTiles: Record<number, Tile[]>
}

// ***INITIAL STATE***
const initialState: TilingState = {
  visibleTiles: {},
}

// ***ACTION CONSTANTS***
export const UPDATE_VISIBLE_TILES = "UPDATE_VISIBLE_TILES"
export const MARK_TILE_STATUS = "MARK_TILE_STATUS"

// ***ACTION INTERFACES***
export interface UpdateVisibleTilesAction extends Action {
  type: typeof UPDATE_VISIBLE_TILES
  payload: Record<number, Tile[]>
}

export interface MarkTileStatusAction extends Action {
  type: typeof MARK_TILE_STATUS
  payload: {
    pageIndex: number
    tileId: string
    status: TileStatus
  }
}

// ***ACTION UNION***
export type TilingAction = UpdateVisibleTilesAction | MarkTileStatusAction

// ***ACTION CREATORS***
const updateVisibleTiles = (tiles: Record<number, Tile[]>): UpdateVisibleTilesAction => ({
  type: UPDATE_VISIBLE_TILES,
  payload: tiles,
})

const markTileStatus = (
  pageIndex: number,
  tileId: string,
  status: TileStatus,
): MarkTileStatusAction => ({
  type: MARK_TILE_STATUS,
  payload: { pageIndex, tileId, status },
})

// ***ACTION REDUCER***
export const reducer: Reducer<TilingState, TilingAction> = (
  state: TilingState,
  action: TilingAction,
) => {
  switch (action.type) {
    case UPDATE_VISIBLE_TILES: {
      const incoming = action.payload
      const nextPages = { ...state.visibleTiles }
      for (const key in incoming) {
        const pageIndex = Number(key)
        const newTiles = incoming[pageIndex]
        const prevTiles = nextPages[pageIndex] ?? []
        const prevScale = prevTiles.find((t) => !t.isFallback)?.srcScale
        const newScale = newTiles[0]?.srcScale
        const zoomChanged = prevScale !== undefined && prevScale !== newScale
        if (zoomChanged) {
          const promoted = prevTiles
            .filter((t) => !t.isFallback && t.status === "ready")
            .map((t) => ({ ...t, isFallback: true }))
          const fallbackToCarry = promoted.length > 0 ? [] : prevTiles.filter((t) => t.isFallback)
          nextPages[pageIndex] = [...fallbackToCarry, ...promoted, ...newTiles]
        } else {
          const newIds = new Set(newTiles.map((t) => t.id))
          const keepers = []
          const seenIds = new Set()
          for (const t of prevTiles) {
            if (t.isFallback) {
              keepers.push(t)
              seenIds.add(t.id)
            } else if (newIds.has(t.id)) {
              keepers.push(t)
              seenIds.add(t.id)
            }
          }
          for (const t of newTiles) {
            if (!seenIds.has(t.id)) keepers.push(t)
          }
          nextPages[pageIndex] = keepers
        }
      }
      return { ...state, visibleTiles: nextPages }
    }
    case MARK_TILE_STATUS: {
      const { pageIndex, tileId, status } = action.payload
      const tiles =
        state.visibleTiles[pageIndex]?.map((t) => (t.id === tileId ? { ...t, status } : t)) ?? []
      const newTiles = tiles.filter((t) => !t.isFallback)
      const allReady = newTiles.every((t) => t.status === "ready")
      const finalTiles = allReady ? newTiles : tiles
      return {
        ...state,
        visibleTiles: { ...state.visibleTiles, [pageIndex]: finalTiles },
      }
    }
    default:
      return state
  }
}

// ***PLUGIN CAPABILITY***
export interface TilingCapability {
  renderTile: (options: RenderTileOptions) => Task<Blob, PdfErrorReason>
  onTileRendering: EventHook<Record<number, Tile[]>>
}

// ***PLUGIN CONFIG***
export interface TilingPluginConfig extends BasePluginConfig {
  enabled?: boolean
  tileSize: number
  overlapPx: number
  extraRings: number
}

// Types are already declared above in the CUSTOM TYPES section

// ***PLUGIN CLASS***
export class TilingPlugin extends BasePlugin<
  TilingPluginConfig,
  TilingCapability,
  TilingState,
  TilingAction
> {
  static readonly id: string = TILING_PLUGIN_ID

  private readonly tileRendering$ = createBehaviorEmitter<Record<number, Tile[]>>()
  private readonly refreshPages$ = createEmitter<number[]>()
  private config: TilingPluginConfig
  private renderCapability: { renderPageRect: (options: any) => any } | null = null
  private scrollCapability: {
    onScroll: (fn: any, options?: any) => void
    getMetrics: (metrics: any) => any
  } | null = null
  private viewportCapability: { getMetrics: () => any } | null = null

  constructor(id: string, registry: PluginRegistry, config: TilingPluginConfig) {
    super(id, registry)
    this.config = config
    const renderPlugin = this.registry.getPlugin("render")
    const scrollPlugin = this.registry.getPlugin("scroll")
    const viewportPlugin = this.registry.getPlugin("viewport")

    this.renderCapability = renderPlugin?.provides ? renderPlugin.provides() : null
    this.scrollCapability = scrollPlugin?.provides ? scrollPlugin.provides() : null
    this.viewportCapability = viewportPlugin?.provides ? viewportPlugin.provides() : null

    if (this.scrollCapability) {
      this.scrollCapability.onScroll(
        (scrollMetrics: any) => this.calculateVisibleTiles(scrollMetrics),
        {
          mode: "throttle",
          wait: 50,
          throttleMode: "trailing",
        },
      )
    }

    this.coreStore.onAction(REFRESH_PAGES, (action: any) => {
      this.refreshPages$.emit(action.payload)
    })
  }

  async initialize() {}

  protected onCoreStoreUpdated(oldState: StoreState<CoreState>, newState: StoreState<CoreState>) {
    if (
      oldState.core.scale !== newState.core.scale &&
      this.scrollCapability &&
      this.viewportCapability
    ) {
      this.calculateVisibleTiles(
        this.scrollCapability.getMetrics(this.viewportCapability.getMetrics()),
      )
    }
  }

  onRefreshPages(fn: (pages: number[]) => void): Unsubscribe {
    return this.refreshPages$.on(fn)
  }

  private calculateVisibleTiles(scrollMetrics: any) {
    if (!this.config.enabled) {
      this.dispatch(updateVisibleTiles({}))
      return
    }

    const scale = this.coreState.core.scale
    const rotation = this.coreState.core.rotation
    const visibleTiles: Record<number, Tile[]> = {}

    for (const scrollMetric of scrollMetrics.pageVisibilityMetrics) {
      const pageIndex = scrollMetric.pageNumber - 1
      const page = this.coreState.core.document?.pages[pageIndex]
      if (!page) continue

      const tiles = calculateTilesForPage({
        page,
        metric: scrollMetric,
        scale,
        rotation,
        tileSize: this.config.tileSize,
        overlapPx: this.config.overlapPx,
        extraRings: this.config.extraRings,
      })
      visibleTiles[pageIndex] = tiles
    }

    this.dispatch(updateVisibleTiles(visibleTiles))
  }

  protected onStoreUpdated(_prevState: TilingState, newState: TilingState) {
    this.tileRendering$.emit(newState.visibleTiles)
  }

  protected buildCapability(): TilingCapability {
    return {
      renderTile: this.renderTile.bind(this),
      onTileRendering: this.tileRendering$.on,
    }
  }

  private renderTile(options: RenderTileOptions) {
    if (!this.renderCapability) {
      throw new Error("Render capability not available.")
    }

    this.dispatch(markTileStatus(options.pageIndex, options.tile.id, "rendering"))

    const task = this.renderCapability.renderPageRect({
      pageIndex: options.pageIndex,
      rect: options.tile.pageRect,
      options: {
        scaleFactor: options.tile.srcScale,
        dpr: options.dpr,
      },
    })

    task.wait(() => {
      this.dispatch(markTileStatus(options.pageIndex, options.tile.id, "ready"))
    }, ignore)

    return task
  }
}

// ***MANIFEST***
const manifest: PluginManifest<TilingPluginConfig> = {
  id: TILING_PLUGIN_ID,
  name: "Tiling Plugin",
  version: "1.0.0",
  provides: [TILING_PLUGIN_ID],
  requires: ["render", "scroll", "viewport"],
  optional: [],
  defaultConfig: {
    enabled: true,
    tileSize: 768,
    overlapPx: 2.5,
    extraRings: 0,
  },
}

// **PLUGIN PACKAGE***
export const TilingPluginPackage: PluginPackage<
  TilingPlugin,
  TilingPluginConfig,
  TilingState,
  TilingAction
> = {
  manifest,
  create: (registry: PluginRegistry, config: TilingPluginConfig) =>
    new TilingPlugin(TILING_PLUGIN_ID, registry, config),
  reducer,
  initialState,
}

// ***PLUGIN HOOKS***
export const useTilingPlugin = () => usePlugin(TILING_PLUGIN_ID)
export const useTilingCapability = () => useCapability(TILING_PLUGIN_ID)

// *****HELPER FUNCTIONS*****
function calculateTilesForPage({
  tileSize = 768,
  overlapPx = 2.5,
  extraRings = 0,
  scale,
  rotation,
  page,
  metric,
}: CalculateTilesForPageOptions): Tile[] {
  const pageW = page.size.width * scale
  const pageH = page.size.height * scale
  const step = tileSize - overlapPx
  const containerSize = transformSize(page.size, rotation, scale)
  const rotatedVisRect = {
    origin: { x: metric.scaled.pageX, y: metric.scaled.pageY },
    size: {
      width: metric.scaled.visibleWidth,
      height: metric.scaled.visibleHeight,
    },
  }
  const unrotatedVisRect = restoreRect(containerSize, rotatedVisRect, rotation, 1)
  const visLeft = unrotatedVisRect.origin.x
  const visTop = unrotatedVisRect.origin.y
  const visRight = visLeft + unrotatedVisRect.size.width
  const visBottom = visTop + unrotatedVisRect.size.height
  const maxCol = Math.floor((pageW - 1) / step)
  const maxRow = Math.floor((pageH - 1) / step)
  const startCol = Math.max(0, Math.floor(visLeft / step) - extraRings)
  const endCol = Math.min(maxCol, Math.floor((visRight - 1) / step) + extraRings)
  const startRow = Math.max(0, Math.floor(visTop / step) - extraRings)
  const endRow = Math.min(maxRow, Math.floor((visBottom - 1) / step) + extraRings)

  const tiles: Tile[] = []
  for (let col = startCol; col <= endCol; col++) {
    const xScreen = col * step
    const wScreen = Math.min(tileSize, pageW - xScreen)
    const xPage = xScreen / scale
    const wPage = wScreen / scale
    for (let row = startRow; row <= endRow; row++) {
      const yScreen = row * step
      const hScreen = Math.min(tileSize, pageH - yScreen)
      const yPage = yScreen / scale
      const hPage = hScreen / scale
      tiles.push({
        id: `p${page.index}-${scale}-x${xScreen}-y${yScreen}-w${wScreen}-h${hScreen}`,
        col,
        row,
        pageRect: {
          origin: { x: xPage, y: yPage },
          size: { width: wPage, height: hPage },
        },
        screenRect: {
          origin: { x: xScreen, y: yScreen },
          size: { width: wScreen, height: hScreen },
        },
        status: "queued",
        srcScale: scale,
        isFallback: false,
      })
    }
  }
  return tiles
}

// *****COMPONENTS******
interface TileImgProps {
  pageIndex: number
  tile: Tile
  dpr: number
  scale: number
}

function TileImg({ pageIndex, tile, dpr, scale }: TileImgProps) {
  const { provides: tilingCapability } = useTilingCapability()
  const { plugin: tilingPlugin } = useTilingPlugin()
  const [url, setUrl] = useState<string>()
  const urlRef = useRef<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const relativeScale = scale / tile.srcScale

  useEffect(() => {
    if (!tilingPlugin) return
    return (tilingPlugin as TilingPlugin).onRefreshPages((pages: number[]) => {
      if (pages.includes(pageIndex)) {
        setRefreshTick((tick) => tick + 1)
      }
    })
  }, [tilingPlugin, pageIndex])

  useEffect(() => {
    if (tile.status === "ready" && urlRef.current) return
    if (!tilingCapability) return

    const task = (tilingCapability as TilingCapability).renderTile({
      pageIndex,
      tile,
      dpr,
    })
    task.wait((blob: Blob) => {
      const objectUrl = URL.createObjectURL(blob)
      urlRef.current = objectUrl
      setUrl(objectUrl)
    }, ignore)

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      } else {
        task.abort({
          code: PdfErrorCode.Cancelled,
          message: "canceled render task",
        })
      }
    }
  }, [pageIndex, tile.id, refreshTick, tilingCapability, dpr])

  const handleImageLoad = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }

  if (!url) return null

  return /* @__PURE__ */ jsx("img", {
    src: url,
    onLoad: handleImageLoad,
    style: {
      position: "absolute",
      left: tile.screenRect.origin.x * relativeScale,
      top: tile.screenRect.origin.y * relativeScale,
      width: tile.screenRect.size.width * relativeScale,
      height: tile.screenRect.size.height * relativeScale,
      display: "block",
    },
  })
}

interface TilingLayerProps {
  pageIndex: number
  scale: number
  style?: React.CSSProperties
  [key: string]: any
}

export function TilingLayer({ pageIndex, scale, style, ...props }: TilingLayerProps) {
  const { provides: tilingProvides } = useTilingCapability()
  const [tiles, setTiles] = useState<Tile[]>([])

  useEffect(() => {
    if (tilingProvides) {
      return (tilingProvides as TilingCapability).onTileRendering(
        (tilesMap: Record<number, Tile[]>) => setTiles(tilesMap[pageIndex] || []),
      )
    }
  }, [tilingProvides, pageIndex])

  return /* @__PURE__ */ jsx("div", {
    style: {
      ...style,
    },
    ...props,
    children:
      tiles == null
        ? undefined
        : tiles.map((tile) =>
            /* @__PURE__ */ jsx(
              TileImg,
              {
                pageIndex,
                tile,
                dpr: window.devicePixelRatio,
                scale,
              },
              tile.id,
            ),
          ),
  })
}
