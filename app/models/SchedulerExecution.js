'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SchedulerExecution extends Model {}

  SchedulerExecution.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    job_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    business_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'RUNNING',
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    skipped_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failed_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'SchedulerExecution',
    tableName: 'scheduler_executions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['job_name', 'business_date'],
        name: 'scheduler_executions_job_date_unique',
      },
    ],
  });

  return SchedulerExecution;
};
