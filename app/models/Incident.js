'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Incident extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Incident.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      // Relación con la tabla de hogares
      Incident.belongsTo(models.Branch, {
        foreignKey: "branch_id",
        as: "branch",
      });
    }
  }
  Incident.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true, // Indica que 'id' es la clave primaria
      autoIncrement: true, // Esto hace que el campo 'id' sea auto-incrementable
    },
    branch_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW, // Establece la fecha actual por defecto
    },
  }, {
    sequelize,
    modelName: 'Incident',
    tableName: 'incidents',
    timestamps: true
  });
  return Incident;
};