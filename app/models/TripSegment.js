'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TripSegment extends Model {
    static associate(models) {
      TripSegment.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
      });

      TripSegment.belongsTo(models.Trip, {
        foreignKey: 'trip_id',
        as: 'trip',
      });

      TripSegment.belongsTo(models.TripStop, {
        foreignKey: 'origin_trip_stop_id',
        as: 'originTripStop',
      });

      TripSegment.belongsTo(models.TripStop, {
        foreignKey: 'destination_trip_stop_id',
        as: 'destinationTripStop',
      });

      TripSegment.belongsTo(models.FareSegment, {
        foreignKey: 'source_fare_segment_id',
        as: 'sourceFareSegment',
      });

      TripSegment.hasMany(models.TripFare, {
        foreignKey: 'trip_segment_id',
        as: 'tripFares',
      });
    }
  }

  TripSegment.init(
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      trip_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      origin_trip_stop_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      destination_trip_stop_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      source_fare_segment_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'CLP',
      },
      valid_from: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      valid_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      source_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'manual',
      },
    },
    {
      sequelize,
      modelName: 'TripSegment',
      tableName: 'trip_segments',
      timestamps: true,
    }
  );

  return TripSegment;
};
