'use strict';

const { Op } = require('sequelize');
const { UserToken } = require('../models');
const logger = require('../../config/logger');

function getCurrentDayRange() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return { startOfDay, startOfNextDay };
}

async function revokeDailyUserTokens(options = {}) {
  const { reason = 'daily-session-cutoff' } = options;
  const { startOfNextDay } = getCurrentDayRange();

  const [revokedCount] = await UserToken.update(
    { revoked: true },
    {
      where: {
        revoked: false,
        expires_at: {
          [Op.lt]: startOfNextDay
        }
      }
    }
  );

  logger.info(
    `UserTokenService->revokeDailyUserTokens: tokens revocados=${revokedCount} | reason=${reason} | expires_at<${startOfNextDay.toISOString()}`
  );

  return revokedCount;
}

module.exports = {
  revokeDailyUserTokens
};
