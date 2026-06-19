'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BranchRoute extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BranchRoute.belongsTo(models.Branch, {
        foreignKey: 'branch_id',
        as: 'branch' // El alias es 'branch' para acceder a la instancia de Branch
      });
  
      // Relación con el modelo Route (cada BranchRoute pertenece a un Route)
      BranchRoute.belongsTo(models.Route, {
        foreignKey: 'route_id',
        as: 'route' // El alias es 'route' para acceder a la instancia de Route
      });
    }
  }
  BranchRoute.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,   // Indica que 'id' es la clave primaria
      autoIncrement: true // Esto hace que el campo 'id' sea auto-incrementable
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo branch_id es obligatorio'
        },
        isInt: {
          msg: 'El campo branch_id debe ser un número entero'
        }
      }
    },
    route_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'El campo route_id es obligatorio'
        },
        isInt: {
          msg: 'El campo route_id debe ser un número entero'
        }
      }
    },
    price: {
      type: DataTypes.DECIMAL(14,2),
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'BranchRoute',
    tableName: 'branch_routes',
    timestamps: true
  });
  return BranchRoute;
};
