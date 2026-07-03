import type { ILogger, LogContext, LogEntry, LogLevel } from "./logger.types";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class PumLogger implements ILogger {
  private readonly minLevel: LogLevel;
  private readonly module?: string;

  constructor(module?: string) {
    this.module = module;
    const envLevel = (process.env.LOG_LEVEL ?? "info") as LogLevel;
    this.minLevel = LEVEL_PRIORITY[envLevel] !== undefined ? envLevel : "info";
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(this.module ? { module: this.module } : {}),
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };

    const output = JSON.stringify(entry);

    // console.error/log son compatibles con Edge Runtime y Node.js
    if (level === "error" || level === "warn") {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: LogContext): void { this.write("debug", message, context); }
  info(message: string, context?: LogContext): void  { this.write("info",  message, context); }
  warn(message: string, context?: LogContext): void  { this.write("warn",  message, context); }
  error(message: string, context?: LogContext): void { this.write("error", message, context); }

  child(module: string): ILogger {
    const childModule = this.module ? `${this.module}:${module}` : module;
    return new PumLogger(childModule);
  }
}

export const logger: ILogger = new PumLogger();
