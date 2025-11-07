import {
  AllLogger,
  ConsoleLogger,
  LevelLogger,
  Logger,
  LogLevel,
  NoopLogger,
  PerfLogger,
} from '../logger';

/**
 * Serializable representation of a logger
 */
export type SerializedLogger = {
  type: 'noop' | 'console' | 'level' | 'perf' | 'all';
  config?: {
    level?: LogLevel; // for LevelLogger
    logger?: SerializedLogger; // for LevelLogger (wrapped logger)
    loggers?: SerializedLogger[]; // for AllLogger (child loggers)
  };
};

/**
 * Convert a Logger instance to a serializable JSON object
 * @param logger - The logger instance to serialize
 * @returns Serialized logger object
 */
export function serializeLogger(logger: Logger): SerializedLogger {
  if (logger instanceof NoopLogger) {
    return { type: 'noop' };
  }

  if (logger instanceof ConsoleLogger) {
    return { type: 'console' };
  }

  if (logger instanceof PerfLogger) {
    return { type: 'perf' };
  }

  if (logger instanceof LevelLogger) {
    // Access private properties using type assertion
    const levelLogger = logger as any;
    return {
      type: 'level',
      config: {
        level: levelLogger.level,
        logger: serializeLogger(levelLogger.logger),
      },
    };
  }

  if (logger instanceof AllLogger) {
    // Access private properties using type assertion
    const allLogger = logger as any;
    return {
      type: 'all',
      config: {
        loggers: allLogger.loggers.map(serializeLogger),
      },
    };
  }

  // Fallback to noop if unknown type
  return { type: 'noop' };
}

/**
 * Convert a serialized logger object back to a Logger instance
 * @param serialized - The serialized logger object
 * @returns Logger instance
 */
export function deserializeLogger(serialized: SerializedLogger): Logger {
  switch (serialized.type) {
    case 'noop':
      return new NoopLogger();

    case 'console':
      return new ConsoleLogger();

    case 'perf':
      return new PerfLogger();

    case 'level':
      if (!serialized.config?.logger || serialized.config?.level === undefined) {
        throw new Error('LevelLogger requires logger and level in config');
      }
      return new LevelLogger(deserializeLogger(serialized.config.logger), serialized.config.level);

    case 'all':
      if (!serialized.config?.loggers) {
        throw new Error('AllLogger requires loggers array in config');
      }
      return new AllLogger(serialized.config.loggers.map(deserializeLogger));

    default:
      // Fallback to noop for unknown types
      return new NoopLogger();
  }
}
