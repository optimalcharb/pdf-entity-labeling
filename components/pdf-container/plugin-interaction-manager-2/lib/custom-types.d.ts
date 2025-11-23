import { Position } from "@embedpdf/models"

export interface InteractionExclusionRules {
  /** Class names that should be excluded */
  classes?: string[]
  /** Data attributes that should be excluded (e.g., 'data-no-interaction') */
  dataAttributes?: string[]
}

export interface InteractionMode {
  /** unique id */
  id: string
  /** where the handlers should listen for events */
  scope: "global" | "page"
  /** if true the page will receive events through a transparent overlay and no other page‑level
   *  listener gets invoked until the mode finishes. */
  exclusive: boolean
  /** baseline cursor while the mode is active (before any handler overrides it). */
  cursor?: string
  /** Set to `false` when this tool wants to disable raw touch events.
   *  Defaults to `true`. */
  wantsRawTouch?: boolean
}

export interface EmbedPdfPointerEvent {
  clientX: number
  clientY: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  target: any
  currentTarget: any
  setPointerCapture?(): void
  releasePointerCapture?(): void
}

export interface PointerEventHandlers<T = EmbedPdfPointerEvent> {
  onPointerDown?(pos: Position, evt: T, modeId: string): void
  onPointerUp?(pos: Position, evt: T, modeId: string): void
  onPointerMove?(pos: Position, evt: T, modeId: string): void
  onPointerEnter?(pos: Position, evt: T, modeId: string): void
  onPointerLeave?(pos: Position, evt: T, modeId: string): void
  onPointerCancel?(pos: Position, evt: T, modeId: string): void
  onMouseDown?(pos: Position, evt: T, modeId: string): void
  onMouseUp?(pos: Position, evt: T, modeId: string): void
  onMouseMove?(pos: Position, evt: T, modeId: string): void
  onMouseEnter?(pos: Position, evt: T, modeId: string): void
  onMouseLeave?(pos: Position, evt: T, modeId: string): void
  onMouseCancel?(pos: Position, evt: T, modeId: string): void
  onClick?(pos: Position, evt: T, modeId: string): void
  onDoubleClick?(pos: Position, evt: T, modeId: string): void
}

export interface PointerEventHandlersWithLifecycle<T = EmbedPdfPointerEvent>
  extends PointerEventHandlers<T> {
  onHandlerActiveStart?(modeId: string): void
  onHandlerActiveEnd?(modeId: string): void
}

interface GlobalInteractionScope {
  type: "global"
}

interface PageInteractionScope {
  type: "page"
  pageIndex: number
}

export type InteractionScope = GlobalInteractionScope | PageInteractionScope

export interface RegisterHandlersOptions {
  /** the mode the handlers belong to                     */
  modeId: string | string[]
  /** callbacks                                            */
  handlers: PointerEventHandlersWithLifecycle
  /** if omitted ⇒ handlers listen on the *global* layer   */
  pageIndex?: number
}

export interface RegisterAlwaysOptions {
  scope: InteractionScope
  handlers: PointerEventHandlersWithLifecycle
}

export interface CursorClaim {
  cursor: string
  priority: number
}

type HandlerSet = Set<PointerEventHandlersWithLifecycle>
type PageHandlerMap = Map<number /*pageIdx*/, HandlerSet>

export interface ModeBuckets {
  /** handlers that listen on the global wrapper (only once per viewer) */
  global: HandlerSet
  /** handlers that listen on a *specific* page wrapper */
  page: PageHandlerMap
}
