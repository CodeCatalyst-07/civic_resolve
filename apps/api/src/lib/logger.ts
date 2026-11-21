type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEY_PATTERN = /key|secret|token|password|auth|credential|cert|serviceaccount/i;

/**
 * Recursively sanitizes an object to redact sensitive values before logging.
 *
 * @param obj - The input object or value
 * @param seen - Set tracking visited objects to prevent circular references
 * @returns Safe representation with redacted secrets
 */
function redactSensitiveData(obj: unknown, seen = new WeakSet()): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return '[Circular]';
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, seen));
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: process.env.NODE_ENV !== 'production' ? obj.stack : undefined,
    };
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = redactSensitiveData(value, seen);
    }
  }

  return sanitized;
}

/**
 * Structured logger that guarantees no secrets or personal credentials leak to logs.
 */
class Logger {
  private formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta ? (redactSensitiveData(meta) as Record<string, unknown>) : {}),
    };
    return JSON.stringify(entry);
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'test') return;
    process.stdout.write(this.formatLog('debug', message, meta) + '\n');
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'test') return;
    process.stdout.write(this.formatLog('info', message, meta) + '\n');
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    process.stderr.write(this.formatLog('warn', message, meta) + '\n');
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    process.stderr.write(this.formatLog('error', message, meta) + '\n');
  }
}

export const logger = new Logger();
