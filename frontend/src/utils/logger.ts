/**
 * Frontend Logger
 * Provides structured logging for API requests, errors, and user actions
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class FrontendLogger {
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;
  private enableConsole = true;

  constructor() {
    // Enable console logging in development
    this.enableConsole = import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log an API request
   */
  logApiRequest(url: string, method: string, data?: any): void {
    this.info(`[API Request] ${method} ${url}`, {
      url,
      method,
      data: this.sanitizeData(data),
    });
  }

  /**
   * Log an API response
   */
  logApiResponse(url: string, status: number, data?: any, duration?: number): void {
    const level = status >= 400 ? LogLevel.ERROR : status >= 300 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `[API Response] ${status} ${url}`, {
      url,
      status,
      duration: duration ? `${duration}ms` : undefined,
      data: this.sanitizeData(data),
    });
  }

  /**
   * Log an API error
   */
  logApiError(url: string, error: any): void {
    this.error(`[API Error] ${url}`, {
      url,
      error: {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: import.meta.env.DEV ? error.stack : undefined,
      },
    });
  }

  /**
   * Log a user action
   */
  logUserAction(action: string, details?: any): void {
    this.info(`[User Action] ${action}`, details);
  }

  /**
   * Log a component lifecycle event (for debugging)
   */
  logComponentEvent(component: string, event: string, data?: any): void {
    if (import.meta.env.DEV) {
      this.debug(`[Component] ${component} - ${event}`, data);
    }
  }

  /**
   * Get error details from various error types
   */
  getErrorDetails(error: any): any {
    if (!error) return null;

    const details: any = {
      message: error.message || 'Unknown error',
      type: error.constructor?.name || 'Error',
    };

    // Axios error
    if (error.response) {
      details.status = error.response.status;
      details.statusText = error.response.statusText;
      details.data = error.response.data;
    }

    // Network error
    if (error.code) {
      details.code = error.code;
    }

    // Stack trace (only in development)
    if (import.meta.env.DEV && error.stack) {
      details.stack = error.stack;
    }

    return details;
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    // Add to history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Console output
    if (this.enableConsole) {
      const consoleMethod = this.getConsoleMethod(level);
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;

      if (data) {
        consoleMethod(`${prefix} ${message}`, data);
      } else {
        consoleMethod(`${prefix} ${message}`);
      }
    }
  }

  /**
   * Sanitize data before logging
   */
  private sanitizeData(data: any, maxLength: number = 500): any {
    if (!data) return data;

    // Handle strings
    if (typeof data === 'string') {
      return data.length > maxLength ? data.substring(0, maxLength) + '...' : data;
    }

    // Handle objects
    if (typeof data === 'object') {
      try {
        const str = JSON.stringify(data);
        if (str.length > maxLength) {
          return str.substring(0, maxLength) + '...';
        }
        return data;
      } catch (error) {
        return '[Circular or non-serializable object]';
      }
    }

    return data;
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.ERROR:
        return console.error.bind(console);
      case LogLevel.WARN:
        return console.warn.bind(console);
      case LogLevel.DEBUG:
        return console.debug?.bind(console) || console.log.bind(console);
      case LogLevel.INFO:
      default:
        return console.log.bind(console);
    }
  }

  /**
   * Get log history
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /**
   * Download logs as file
   */
  downloadLogs(): void {
    const logs = this.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frontend-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const logger = new FrontendLogger();

// Export as default
export default logger;
