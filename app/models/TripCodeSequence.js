'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TripCodeSequence extends Model {
    static associate(models) {
      TripCodeSequence.belongsTo(models.Route, {
        foreignKey: 'route_id',
        as: 'route',
        onDelete: 'CASCADE',
      });
    }
  }

  TripCodeSequence.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    route_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    trip_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    last_sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'TripCodeSequence',
    tableName: 'trip_code_sequences',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['route_id', 'trip_date'],
        name: 'trip_code_sequences_route_date_unique',
      },
    ],
  });

  return TripCodeSequence;
};
