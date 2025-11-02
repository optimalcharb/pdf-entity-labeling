export interface Logger {
  /**
   * Check if a log level is enabled
   * @param level - log level to check
   * @returns true if the level is enabled
   *
   * @public
   */
  isEnabled: (level: "debug" | "info" | "warn" | "error") => boolean
  /**
   * Log debug message
   * @param source - source of log
   * @param category - category of log
   * @param args - parameters of log
   * @returns
   *
   * @public
   */
  debug: (source: string, category: string, ...args: any) => void
  /**
   * Log info message
   * @param source - source of log
   * @param category - category of log
   * @param args - parameters of log
   * @returns
   *
   * @public
   */
  info: (source: string, category: string, ...args: any) => void
  /**
   * Log warning message
   * @param source - source of log
   * @param category - category of log
   * @param args - parameters of log
   * @returns
   *
   * @public
   */
  warn: (source: string, category: string, ...args: any) => void
  /**
   * Log error message
   * @param source - source of log
   * @param category - category of log
   * @param args - parameters of log
   * @returns
   *
   * @public
   */
  error: (source: string, category: string, ...args: any) => void
  /**
   * Log performance log
   * @param source - source of log
   * @param category - category of log
   * @param event - event of log
   * @param phase - event phase of log
   * @param args - parameters of log
   * @returns
   *
   * @public
   */
  perf: (
    source: string,
    category: string,
    event: string,
    phase: "Begin" | "End",
    ...args: any
  ) => void
}

export class NoopLogger implements Logger {
  /** {@inheritDoc Logger.isEnabled} */
  isEnabled(): boolean {
    return false
  }
  /** {@inheritDoc Logger.debug} */
  debug(): void {}
  /** {@inheritDoc Logger.info} */
  info(): void {}
  /** {@inheritDoc Logger.warn} */
  warn(): void {}
  /** {@inheritDoc Logger.error} */
  error(): void {}
  /** {@inheritDoc Logger.perf} */
  perf(): void {}
}

export class ConsoleLogger implements Logger {
  /** {@inheritDoc Logger.isEnabled} */
  isEnabled(): boolean {
    return true
  }
  /** {@inheritDoc Logger.debug} */
  debug(source: string, category: string, ...args: any): void {
    console.debug(`${source}.${category}`, ...args)
  }
  /** {@inheritDoc Logger.info} */
  info(source: string, category: string, ...args: any): void {
    console.info(`${source}.${category}`, ...args)
  }
  /** {@inheritDoc Logger.warn} */
  warn(source: string, category: string, ...args: any): void {
    console.warn(`${source}.${category}`, ...args)
  }
  /** {@inheritDoc Logger.error} */
  error(source: string, category: string, ...args: any): void {
    console.error(`${source}.${category}`, ...args)
  }
  /** {@inheritDoc Logger.perf} */
  perf(
    source: string,
    category: string,
    event: string,
    phase: "Begin" | "End",
    ...args: any
  ): void {
    console.info(`${source}.${category}.${event}.${phase}`, ...args)
  }
}

export type SerializedLogger = {
  type: "noop" | "console"
  config?: {
    level?: LogLevel
    logger?: SerializedLogger
    loggers?: SerializedLogger[]
  }
}

export type LogLevel = "debug" | "info" | "warn" | "error"

/**
 * Convert a Logger instance to a serializable JSON object
 * @param logger - The logger instance to serialize
 * @returns Serialized logger object
 *
 * @public
 */
export function serializeLogger(logger: Logger): SerializedLogger {
  if (logger instanceof ConsoleLogger) {
    return { type: "console" }
  }
  return { type: "noop" }
}

/**
 * Convert a serialized logger object back to a Logger instance
 * @param serialized - The serialized logger object
 * @returns Logger instance
 *
 * @public
 */
export function deserializeLogger(serialized: SerializedLogger): Logger {
  switch (serialized.type) {
    case "noop":
      return new NoopLogger()
    case "console":
      return new ConsoleLogger()
    default:
      return new NoopLogger()
  }
}
