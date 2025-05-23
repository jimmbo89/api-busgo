/*const winston = require('winston');
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

module.exports = logger;*/
const winston = require('winston');
const { format } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// 1. Definir rutas - todo en la raíz del proyecto
const logDir = path.join(process.cwd(), 'logs');
const errorLogDir = path.join(logDir, 'errors');
const combinedLogDir = path.join(logDir, 'combined');

// 2. Crear directorios de logs si no existen (versión robusta)
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`Directorio de logs creado: ${logDir}`);
  }
  if (!fs.existsSync(errorLogDir)) {
    fs.mkdirSync(errorLogDir, { recursive: true });
    console.log(`Subdirectorio para errores creado: ${errorLogDir}`);
  }
  if (!fs.existsSync(combinedLogDir)) {
    fs.mkdirSync(combinedLogDir, { recursive: true });
    console.log(`Subdirectorio combinado creado: ${combinedLogDir}`);
  }
} catch (err) {
  console.error('Error crítico al crear directorios de logs:', err);
  process.exit(1); // Salir si no podemos crear los directorios
}

// 3. Configuración del logger
const logger = winston.createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    // Log a consola (obligatorio para ver logs inmediatamente)
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    // Log de errores rotativo
    new DailyRotateFile({
      filename: 'error-%DATE%.log',
      dirname: errorLogDir,
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d' // Conservar por 14 días
    }),
    // Log combinado rotativo
    new DailyRotateFile({
      filename: 'combined-%DATE%.log',
      dirname: combinedLogDir,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d' // Conservar por 7 días
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(errorLogDir, 'exceptions.log')
    })
  ]
});

// 4. Verificación de que funciona
logger.info('Logger configurado correctamente');
logger.debug(`Los logs se guardarán en: ${logDir}`);

// 5. Manejo de errores del propio logger
logger.on('error', error => {
  console.error('Error en el sistema de logging:', error);
});

module.exports = logger;