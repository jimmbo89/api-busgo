// scheduler.js
const cron = require('node-cron');

const TripTemplateController = require('../app/controllers/TripTemplateController');
const { revokeDailyUserTokens } = require('../app/services/UserTokenService');
const {
  getBusinessDate,
  beginExecution,
  finishExecution,
  failExecution,
} = require('../app/services/SchedulerExecutionService');
const logger = require('./logger');

const schedulerCron = process.env.SCHEDULER_CRON || '0 3 * * *';
const schedulerTimezone = process.env.SCHEDULER_TIMEZONE || process.env.TZ || 'America/Santiago';
const recoveryIntervalMinutes = Number(process.env.SCHEDULER_RECOVERY_INTERVAL_MINUTES || 20);
const recoveryIntervalMs = Math.max(recoveryIntervalMinutes, 1) * 60 * 1000;

let isRunning = false;
let recoveryInterval = null;

async function runScheduledJob(options = {}) {
  const { reason = 'cron', allowPastTime = false, revokeTokens = false } = options;

  if (isRunning) {
    logger.info(`scheduler->runScheduledJob: omitido porque ya hay una ejecucion en curso | reason=${reason}`);
    return;
  }

  isRunning = true;
  let businessDate = null;
  let execution = null;
  let generationResult = null;

  try {
    businessDate = getBusinessDate();
    const executionState = await beginExecution(businessDate);

    if (!executionState.shouldRun) {
      logger.info(`scheduler->runScheduledJob: omitido porque ya finalizo correctamente | reason=${reason} | fecha=${businessDate}`);
      return;
    }

    execution = executionState.execution;
    logger.info(`scheduler->runScheduledJob: inicio | reason=${reason} | allowPastTime=${allowPastTime} | fecha=${businessDate} | ${new Date().toISOString()}`);

    const mockReq = {
      body: {
        allowPastTime
      }
    };
    const mockRes = {
      status: () => ({
        json: (payload) => {
          generationResult = payload;
          return payload;
        }
      })
    };

    if (revokeTokens) {
      try {
        await revokeDailyUserTokens({ reason });
      } catch (error) {
        logger.error(`scheduler->runScheduledJob: error revocando tokens | reason=${reason} | ${error.message}`);
      }
    }

    await TripTemplateController.generateTripsForDate(mockReq, mockRes);
    const status = await finishExecution(execution, generationResult || {});
    logger.info(`scheduler->runScheduledJob: resultado | reason=${reason} | fecha=${businessDate} | status=${status}`);
  } catch (error) {
    if (execution) {
      try {
        await failExecution(execution, error);
      } catch (stateError) {
        logger.error(`scheduler->runScheduledJob: error actualizando estado | reason=${reason} | ${stateError.message}`);
      }
    }
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

function startRecoveryMonitor() {
  if (recoveryInterval) {
    return;
  }

  recoveryInterval = setInterval(() => {
    runScheduledJob({
      reason: 'periodic-recovery',
      allowPastTime: true,
    }).catch((error) => {
      logger.error(`scheduler->periodic-recovery: error no controlado | ${error.message}`);
    });
  }, recoveryIntervalMs);

  logger.info(`Monitor de recuperación iniciado | intervalo_minutos=${recoveryIntervalMinutes}`);
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
  runStartupRecovery,
  startRecoveryMonitor,
};
