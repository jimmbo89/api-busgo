'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ticket_web_payments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      idempotency_key: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      fingerprint: { type: Sequelize.STRING(64), allowNull: false },
      branch_id: { type: Sequelize.INTEGER, allowNull: false },
      trip_id: { type: Sequelize.INTEGER, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      device: { type: Sequelize.STRING(255), allowNull: false },
      method: { type: Sequelize.STRING(20), allowNull: false },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      seats: { type: Sequelize.JSON, allowNull: false },
      fare_segment_ids: { type: Sequelize.JSON, allowNull: false },
      sale_snapshot: { type: Sequelize.JSON, allowNull: false },
      dispatch_state: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'RESERVED' },
      tuu_status: { type: Sequelize.SMALLINT, allowNull: true },
      tuu_sequence_number: { type: Sequelize.TEXT, allowNull: true },
      transaction_reference: { type: Sequelize.TEXT, allowNull: true },
      ticket_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        unique: true,
        references: { model: 'tickets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      last_error: { type: Sequelize.TEXT, allowNull: true },
      dispatched_at: { type: Sequelize.DATE, allowNull: true },
      checked_at: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('ticket_web_payments', ['trip_id', 'dispatch_state'], {
      name: 'ticket_web_payments_trip_state_idx',
    });
    await queryInterface.addIndex('ticket_web_payments', ['user_id', 'idempotency_key'], {
      name: 'ticket_web_payments_user_key_idx',
    });
    await queryInterface.addIndex('ticket_web_payments', ['user_id', 'fingerprint', 'createdAt'], {
      name: 'ticket_web_payments_user_fingerprint_created_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    const rows = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS count FROM ticket_web_payments',
      { type: Sequelize.QueryTypes.SELECT }
    );
    if (Number(rows[0]?.count ?? 0) > 0) {
      throw new Error('No se puede revertir ticket_web_payments con intentos registrados; conserva la conciliación de cobros.');
    }
    await queryInterface.dropTable('ticket_web_payments');
  },
};
