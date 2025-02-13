const winston = require('winston');

// Configuración de Winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }), // Registro de errores
        new winston.transports.File({ filename: 'combined.log' }), // Todos los logs
    ],
});

module.exports = logger;
