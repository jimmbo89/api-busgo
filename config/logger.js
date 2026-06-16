const winston = require('winston');
const { format } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logDir = path.join(process.cwd(), 'logs');
const errorLogDir = path.join(logDir, 'errors');
const combinedLogDir = path.join(logDir, 'combined');

function ensureLogDirectories() {
  fs.mkdirSync(errorLogDir, { recursive: true });
  fs.mkdirSync(combinedLogDir, { recursive: true });
}

ensureLogDirectories();

const logger = winston.createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console({
      format: format.combine(format.colorize(), format.simple())
    }),
    new DailyRotateFile({
      filename: 'error-%DATE%.log',
      dirname: errorLogDir,
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new DailyRotateFile({
      filename: 'combined-%DATE%.log',
      dirname: combinedLogDir,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d'
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(errorLogDir, 'exceptions.log')
    })
  ]
});

logger.info(`Logger configurado. Logs en: ${logDir}`);

module.exports = logger;
