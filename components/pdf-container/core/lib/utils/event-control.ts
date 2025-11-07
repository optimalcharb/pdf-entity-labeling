export type EventHandler<T> = (data: T) => void;

export interface BaseEventControlOptions {
  wait: number;
}

export interface DebounceOptions extends BaseEventControlOptions {
  mode: 'debounce';
}

export interface ThrottleOptions extends BaseEventControlOptions {
  mode: 'throttle';
  throttleMode?: 'leading-trailing' | 'trailing';
}

export type EventControlOptions = DebounceOptions | ThrottleOptions;

export class EventControl<T> {
  private timeoutId?: number;
  private lastRun: number = 0;

  constructor(
    private handler: EventHandler<T>,
    private options: EventControlOptions,
  ) {}

  handle = (data: T): void => {
    if (this.options.mode === 'debounce') {
      this.debounce(data);
    } else {
      this.throttle(data);
    }
  };

  private debounce(data: T): void {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      this.handler(data);
      this.timeoutId = undefined;
    }, this.options.wait);
  }

  private throttle(data: T): void {
    if (this.options.mode === 'debounce') return;

    const now = Date.now();
    const throttleMode = this.options.throttleMode || 'leading-trailing';

    if (now - this.lastRun >= this.options.wait) {
      if (throttleMode === 'leading-trailing') {
        this.handler(data);
      }
      this.lastRun = now;
    }

    // Always schedule the trailing execution
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(
      () => {
        this.handler(data);
        this.lastRun = Date.now();
        this.timeoutId = undefined;
      },
      this.options.wait - (now - this.lastRun),
    );
  }

  destroy(): void {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }
  }
}
