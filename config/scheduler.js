// scheduler.js
const cron = require('node-cron');

const TripTemplateController = require('../app/controllers/TripTemplateController');
const logger = require('./logger');

let isRunning = false;

async function runScheduledJob() {
  if (isRunning) {
    //logger.info('scheduler->runScheduledJob: omitido porque ya hay una ejecucion en curso');
    return;
  }

  isRunning = true;
  //logger.info(`scheduler->runScheduledJob: inicio | ${new Date().toISOString()}`);

  const mockReq = {
    body: {}
  };
  const mockRes = {
    status: () => ({
      json: () => {}
    })
  };

  try {
    await TripTemplateController.generateTripsForDate(mockReq, mockRes);
  } catch (error) {
    logger.error(`scheduler->runScheduledJob: error | ${error.message}`);
  } finally {
    isRunning = false;
    //logger.info(`scheduler->runScheduledJob: fin | ${new Date().toISOString()}`);
  }
}

// Ejecutar inmediatamente al iniciar (opcional)
// runScheduledJob();

// Programar ejecución diaria a las 3:00 AM (hora Chile)
cron.schedule('* * * * *', runScheduledJob, {
  scheduled: true,
  timezone: "America/Santiago"
});

//logger.info('Programador de generación de viajes iniciado');
