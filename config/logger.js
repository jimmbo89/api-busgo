const winston = require('winston');
const { format } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');

// Función para generar el nombre del archivo con fecha
const currentDate = new Date();
const formattedDate = currentDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD

// Configuración de Winston
const logger = winston.createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        // Archivo de errores diario
        new DailyRotateFile({
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
        }),
        // Archivo combinado diario
        new DailyRotateFile({
            filename: 'combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
        })
    ],
});

module.exports = logger;