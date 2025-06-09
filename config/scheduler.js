// scheduler.js
const cron = require('node-cron');

const TripTemplateController = require('../app/controllers/TripTemplateController');
const logger = require('./logger');

async function runScheduledJob() {
  logger.info(`${new Date().toISOString()} - Iniciando generación de viajes...`);
  
  const mockReq = { 
  body: {} // Aunque no lo uses, evita errores de destructuración
    };
  const mockRes = {
    status: () => ({
      json: (data) => logger.info('Resultado:', data)
    })
  };

  try {
    //await sequelize.authenticate(); // Verificar conexión a DB
    await TripTemplateController.generateTripsForDate(mockReq, mockRes);
  } catch (error) {
    logger.error('Error en la tarea programada:', error);
  } finally {
    logger.info(`${new Date().toISOString()} - Finalizada generación de viajes`);
  }
}

// Ejecutar inmediatamente al iniciar (opcional)
// runScheduledJob();

// Programar ejecución diaria a las 3:00 AM (hora Chile)
cron.schedule('15 09 * * *', runScheduledJob, {
  scheduled: true,
  timezone: "America/Santiago"
});

logger.info('Programador de generación de viajes iniciado');