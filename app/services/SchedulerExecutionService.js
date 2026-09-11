const { SchedulerExecution } = require('../models');

const DEFAULT_TIMEZONE = 'America/Santiago';
const JOB_NAME = 'generate-trips';

const getSchedulerTimezone = () =>
  process.env.SCHEDULER_TIMEZONE || process.env.TZ || DEFAULT_TIMEZONE;

const getBusinessDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: getSchedulerTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const countSkipped = (skipped = {}) =>
  Object.values(skipped).reduce((total, value) => total + Number(value || 0), 0);

const getIncompleteSkipCount = (skipped = {}) =>
  Number(skipped.past_time || 0) + Number(skipped.arrival_not_generated || 0);

const beginExecution = async (businessDate = getBusinessDate()) => {
  const now = new Date();
  const [execution] = await SchedulerExecution.findOrCreate({
    where: {
      job_name: JOB_NAME,
      business_date: businessDate,
    },
    defaults: {
      status: 'RUNNING',
      started_at: now,
    },
  });

  if (execution.status === 'SUCCESS') {
    return { execution, shouldRun: false };
  }

  await execution.update({
    status: 'RUNNING',
    started_at: now,
    finished_at: null,
    last_error: null,
  });

  return { execution, shouldRun: true };
};

const finishExecution = async (execution, result = {}) => {
  const skipped = result.skipped || {};
  const failed = Array.isArray(result.failed) ? result.failed : [];
  const incompleteSkipCount = getIncompleteSkipCount(skipped);
  const failedCount = failed.length;
  const status = failedCount > 0
    ? 'FAILED'
    : incompleteSkipCount > 0
      ? 'PARTIAL'
      : 'SUCCESS';

  await execution.update({
    status,
    finished_at: new Date(),
    created_count: Number(result.created || 0),
    skipped_count: countSkipped(skipped),
    failed_count: failedCount,
    last_error: failed.length > 0
      ? failed.map(({ template_id, error }) => `template=${template_id}: ${error}`).join(' | ')
      : null,
  });

  return status;
};

const failExecution = async (execution, error) => {
  await execution.update({
    status: 'FAILED',
    finished_at: new Date(),
    failed_count: 1,
    last_error: error.message,
  });
};

module.exports = {
  JOB_NAME,
  getBusinessDate,
  beginExecution,
  finishExecution,
  failExecution,
};
