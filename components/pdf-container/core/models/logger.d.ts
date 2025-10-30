/**
 * logger for logging
 *
 * @public
 */
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
   * Log infor message
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
/**
 * Logger that log nothing, it will ignore all the logs
 *
 * @public
 */
export declare class NoopLogger implements Logger {
  /** {@inheritDoc Logger.isEnabled} */
  isEnabled(): boolean
  /** {@inheritDoc Logger.debug} */
  debug(): void
  /** {@inheritDoc Logger.info} */
  info(): void
  /** {@inheritDoc Logger.warn} */
  warn(): void
  /** {@inheritDoc Logger.error} */
  error(): void
  /** {@inheritDoc Logger.perf} */
  perf(): void
}
/**
 * Logger that use console as the output
 *
 * @public
 */
export declare class ConsoleLogger implements Logger {
  /** {@inheritDoc Logger.isEnabled} */
  isEnabled(): boolean
  /** {@inheritDoc Logger.debug} */
  debug(source: string, category: string, ...args: any): void
  /** {@inheritDoc Logger.info} */
  info(source: string, category: string, ...args: any): void
  /** {@inheritDoc Logger.warn} */
  warn(source: string, category: string, ...args: any): void
  /** {@inheritDoc Logger.error} */
  error(source: string, category: string, ...args: any): void
  /** {@inheritDoc Logger.perf} */
  perf(source: string, category: string, event: string, phase: "Begin" | "End", ...args: any): void
}
