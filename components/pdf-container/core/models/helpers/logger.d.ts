import { Logger, LogLevel } from "../logger"
/**
 * Serializable representation of a logger
 */
export type SerializedLogger = {
  type: "noop" | "console" | "level" | "perf" | "all"
  config?: {
    level?: LogLevel
    logger?: SerializedLogger
    loggers?: SerializedLogger[]
  }
}
/**
 * Convert a Logger instance to a serializable JSON object
 * @param logger - The logger instance to serialize
 * @returns Serialized logger object
 */
export declare function serializeLogger(logger: Logger): SerializedLogger
/**
 * Convert a serialized logger object back to a Logger instance
 * @param serialized - The serialized logger object
 * @returns Logger instance
 */
export declare function deserializeLogger(serialized: SerializedLogger): Logger
