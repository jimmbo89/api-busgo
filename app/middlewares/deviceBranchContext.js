'use strict';

const DeviceBranchContextService = require('../services/DeviceBranchContextService');

const deviceBranchContext = ({ assignBranchId = false } = {}) => async (
  req,
  res,
  next
) => {
  if (!req.device_id) {
    return next();
  }

  try {
    const context = await DeviceBranchContextService.resolve({
      worker: req.worker,
      device_id: req.device_id,
    });

    req.device_branch_id = context.branch_id;
    req.device_branch = context.branch;

    if (assignBranchId && req.body) {
      req.body.branch_id = context.branch_id;
    }

    return next();
  } catch (error) {
    const status = [
      'DeviceNotAuthenticated',
      'WorkerNotAuthenticated',
    ].includes(error.message)
      ? 401
      : 403;

    return res.status(status).json({
      msg: error.message,
      details: error.message,
    });
  }
};

module.exports = deviceBranchContext;
