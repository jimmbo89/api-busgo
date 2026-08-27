'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_tokens', 'device_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'devices',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('user_tokens', 'platform', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addIndex('user_tokens', ['device_id', 'platform', 'revoked'], {
      name: 'user_tokens_device_platform_revoked'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('user_tokens', 'user_tokens_device_platform_revoked');
    await queryInterface.removeColumn('user_tokens', 'platform');
    await queryInterface.removeColumn('user_tokens', 'device_id');
  }
};
