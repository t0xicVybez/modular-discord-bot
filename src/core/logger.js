const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

/**
 * Logger class for consistent logging throughout the application
 */
class Logger {
    constructor() {
        // Make sure logs directory exists
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }
        
        // Custom format for console and file logs
        const logFormat = printf(({ level, message, timestamp }) => {
            return `[${timestamp}] ${level}: ${message}`;
        });
        
        // Create Winston logger
        this.logger = createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                logFormat
            ),
            transports: [
                // Console transport with colors
                new transports.Console({
                    format: combine(
                        colorize(),
                        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                        logFormat
                    )
                }),
                // File transport for all logs
                new transports.File({
                    filename: path.join(logsDir, 'combined.log'),
                    maxsize: 10485760, // 10MB
                    maxFiles: 5
                }),
                // File transport for error logs
                new transports.File({
                    filename: path.join(logsDir, 'error.log'),
                    level: 'error',
                    maxsize: 10485760, // 10MB
                    maxFiles: 5
                })
            ]
        });
    }
    
    /**
     * Log info level message
     * @param {string} message - The message to log
     */
    info(message) {
        this.logger.info(message);
    }
    
    /**
     * Log warning level message
     * @param {string} message - The message to log
     */
    warn(message) {
        this.logger.warn(message);
    }
    
    /**
     * Log error level message
     * @param {string|Error} error - The error to log
     */
    error(error) {
        if (error instanceof Error) {
            this.logger.error(`${error.message}\n${error.stack}`);
        } else {
            this.logger.error(error);
        }
    }
    
    /**
     * Log debug level message
     * @param {string} message - The message to log
     */
    debug(message) {
        this.logger.debug(message);
    }
}

module.exports = Logger;