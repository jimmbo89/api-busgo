'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Structure extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Structure.hasMany(models.Vehicle, {
        foreignKey: 'structure_id',
        as: 'vehicles',
        onDelete: 'SET NULL'
      });
    }
  }
  Structure.init({
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    seatCount: DataTypes.INTEGER,
    seats: DataTypes.JSON,
    seatMap: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'Structure',
    tableName: 'structures',
    timestamps: true,
  });
  return Structure;
};