export type EventHandler<T> = (data: T) => void
export interface BaseEventControlOptions {
  wait: number
}
export interface DebounceOptions extends BaseEventControlOptions {
  mode: "debounce"
}
export interface ThrottleOptions extends BaseEventControlOptions {
  mode: "throttle"
  throttleMode?: "leading-trailing" | "trailing"
}
export type EventControlOptions = DebounceOptions | ThrottleOptions
export declare class EventControl<T> {
  private handler
  private options
  private timeoutId?
  private lastRun
  constructor(handler: EventHandler<T>, options: EventControlOptions)
  handle: (data: T) => void
  private debounce
  private throttle
  destroy(): void
}
