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

export class EventControl<T> {
  private handler: EventHandler<T>
  private options: EventControlOptions
  private timeoutId?: ReturnType<typeof setTimeout>
  private lastRun: number
  public handle: (data: T) => void

  constructor(handler: EventHandler<T>, options: EventControlOptions) {
    this.handler = handler
    this.options = options
    this.lastRun = 0
    this.handle = (data) => {
      if (this.options.mode === "debounce") {
        this.debounce(data)
      } else {
        this.throttle(data)
      }
    }
  }

  private debounce(data: T) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    this.timeoutId = setTimeout(() => {
      this.handler(data)
      this.timeoutId = undefined
    }, this.options.wait)
  }

  private throttle(data: T) {
    const now = Date.now()
    const throttleMode = (this.options as ThrottleOptions).throttleMode || "leading-trailing"
    if (now - this.lastRun >= this.options.wait) {
      if (throttleMode === "leading-trailing") {
        this.handler(data)
      }
      this.lastRun = now
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    this.timeoutId = setTimeout(
      () => {
        this.handler(data)
        this.lastRun = Date.now()
        this.timeoutId = undefined
      },
      this.options.wait - (now - this.lastRun),
    )
  }

  destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
  }
}
