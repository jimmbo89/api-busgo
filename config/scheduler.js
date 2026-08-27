// scheduler.js
const cron = require('node-cron');

const TripTemplateController = require('../app/controllers/TripTemplateController');
const { revokeDailyUserTokens } = require('../app/services/UserTokenService');
const logger = require('./logger');

const schedulerCron = process.env.SCHEDULER_CRON || '25 7 * * *';
const schedulerTimezone = process.env.SCHEDULER_TIMEZONE || process.env.TZ || 'America/Santiago';

let isRunning = false;

async function runScheduledJob(options = {}) {
  const { reason = 'cron', allowPastTime = false, revokeTokens = false } = options;

  if (isRunning) {
    logger.info(`scheduler->runScheduledJob: omitido porque ya hay una ejecucion en curso | reason=${reason}`);
    return;
  }

  isRunning = true;
  logger.info(`scheduler->runScheduledJob: inicio | reason=${reason} | allowPastTime=${allowPastTime} | ${new Date().toISOString()}`);

  const mockReq = {
    body: {
      allowPastTime
    }
  };
  const mockRes = {
    status: () => ({
      json: () => {}
    })
  };

  try {
    if (revokeTokens) {
      try {
        await revokeDailyUserTokens({ reason });
      } catch (error) {
        logger.error(`scheduler->runScheduledJob: error revocando tokens | reason=${reason} | ${error.message}`);
      }
    }

    await TripTemplateController.generateTripsForDate(mockReq, mockRes);
  } catch (error) {
    logger.error(`scheduler->runScheduledJob: error | reason=${reason} | ${error.message}`);
  } finally {
    isRunning = false;
    logger.info(`scheduler->runScheduledJob: fin | reason=${reason} | ${new Date().toISOString()}`);
  }
}

async function runStartupRecovery() {
  await runScheduledJob({
    reason: 'startup-recovery',
    allowPastTime: true
  });
}

// Ejecutar inmediatamente al iniciar (opcional)
// runScheduledJob();

// Programar ejecución diaria configurable.
cron.schedule(schedulerCron, () => runScheduledJob({
  reason: 'cron',
  revokeTokens: true
}), {
  scheduled: true,
  timezone: schedulerTimezone
});

logger.info(`Programador de generación de viajes iniciado | cron=${schedulerCron} | timezone=${schedulerTimezone}`);

module.exports = {
  runScheduledJob,
  runStartupRecovery
};
