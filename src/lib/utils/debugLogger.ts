// src/lib/utils/debugLogger.ts - UTILITY FOR CONSISTENT LOGGING
// ============================================================================

export type LogLevel = 'info' | 'success' | 'error' | 'warning' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  component: string
  message: string
  data?: any
}

class DebugLogger {
  private logs: LogEntry[] = []
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatTimestamp(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'success':
        return '\x1b[32m' // Green
      case 'error':
        return '\x1b[31m' // Red
      case 'warning':
        return '\x1b[33m' // Yellow
      case 'debug':
        return '\x1b[36m' // Cyan
      case 'info':
      default:
        return '\x1b[34m' // Blue
    }
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'debug':
        return '🔍'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  log(level: LogLevel, component: string, message: string, data?: any) {
    const timestamp = this.formatTimestamp()
    const entry: LogEntry = { timestamp, level, component, message, data }

    this.logs.push(entry)

    // Always log to console in development
    if (this.isDevelopment) {
      const color = this.getColor(level)
      const emoji = this.getEmoji(level)
      const resetColor = '\x1b[0m'

      console.log(
        `${color}[${timestamp}] ${emoji} ${component} - ${message}${resetColor}`,
        data ? data : ''
      )
    }

    // For production, only log errors and warnings to console
    if (!this.isDevelopment && (level === 'error' || level === 'warning')) {
      console.warn(`[${component}] ${message}`, data)
    }
  }

  info(component: string, message: string, data?: any) {
    this.log('info', component, message, data)
  }

  success(component: string, message: string, data?: any) {
    this.log('success', component, message, data)
  }

  error(component: string, message: string, data?: any) {
    this.log('error', component, message, data)
  }

  warning(component: string, message: string, data?: any) {
    this.log('warning', component, message, data)
  }

  debug(component: string, message: string, data?: any) {
    this.log('debug', component, message, data)
  }

  getLogs(): LogEntry[] {
    return this.logs
  }

  clearLogs() {
    this.logs = []
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  // Download logs as JSON file
  downloadLogs() {
    const dataStr = this.exportLogs()
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `debug-logs-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
}

export const debugLogger = new DebugLogger()

// Expose to window in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).debugLogger = debugLogger
}