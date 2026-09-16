'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TicketWebPayment extends Model {}

  TicketWebPayment.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    idempotency_key: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    fingerprint: { type: DataTypes.STRING(64), allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    trip_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    device: { type: DataTypes.STRING(255), allowNull: false },
    method: { type: DataTypes.STRING(20), allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    seats: { type: DataTypes.JSON, allowNull: false },
    fare_segment_ids: { type: DataTypes.JSON, allowNull: false },
    sale_snapshot: { type: DataTypes.JSON, allowNull: false },
    dispatch_state: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'RESERVED' },
    tuu_status: { type: DataTypes.SMALLINT, allowNull: true },
    tuu_sequence_number: { type: DataTypes.TEXT, allowNull: true },
    transaction_reference: { type: DataTypes.TEXT, allowNull: true },
    ticket_id: { type: DataTypes.INTEGER, allowNull: true, unique: true },
    last_error: { type: DataTypes.TEXT, allowNull: true },
    dispatched_at: { type: DataTypes.DATE, allowNull: true },
    checked_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'TicketWebPayment',
    tableName: 'ticket_web_payments',
    timestamps: true,
    indexes: [
      { fields: ['trip_id', 'dispatch_state'], name: 'ticket_web_payments_trip_state_idx' },
      { fields: ['user_id', 'idempotency_key'], name: 'ticket_web_payments_user_key_idx' },
      { fields: ['user_id', 'fingerprint', 'createdAt'], name: 'ticket_web_payments_user_fingerprint_created_idx' },
    ],
  });

  return TicketWebPayment;
};
