import { config } from '../../config/config.js';

/**
 * Configurable logging utility that supports multiple log levels and formats
 * @class
 * @example
 * const logger = new Logger('MyComponent');
 * logger.info('Component initialized');
 * logger.error('Failed to load', new Error('Network error'));
 */
export class Logger {

  /**
 * Creates a new logger instance
 * @param {string} context - Context identifier for log messages
 */
  constructor(context) {
    this.context = context;
    this.level = config.logging.level;
    this.format = config.logging.format;
  }

   /**
   * Formats log message with timestamp and arguments
   * @private
   * @param {string} level - Log level (debug|info|warn|error)
   * @param {string} message - Main log message
   * @param {...*} args - Additional arguments to log
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg =>
      arg instanceof Error ? arg.stack : JSON.stringify(arg)
    ).join(' ');

    if (this.format === 'json') {
      return JSON.stringify([
        timestamp,
        level,
        this.context,
        message
      ]);
    }

    return `${timestamp} ${level} ${this.context} ${message} ${formattedArgs}`.trim();
  }

    /**
   * Core logging method used by level-specific methods
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {...*} args - Additional arguments
   */
  log(level, message, ...args) {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) >= levels.indexOf(this.level)) {
      console[level](this.formatMessage(level.toUpperCase(), message, ...args));
    }
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }
}