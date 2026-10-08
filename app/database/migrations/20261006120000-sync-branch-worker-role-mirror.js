'use strict';

/**
 * BranchWorker.role_id deja de ser una fuente de autorización y se conserva
 * únicamente como espejo informativo y opcional de Worker.role_id.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE branch_workers AS branch_worker
      INNER JOIN workers AS worker ON worker.id = branch_worker.worker_id
      SET branch_worker.role_id = worker.role_id
      WHERE branch_worker.role_id <> worker.role_id
         OR branch_worker.role_id IS NULL
    `);

    await queryInterface.changeColumn('branch_workers', 'role_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE branch_workers AS branch_worker
      INNER JOIN workers AS worker ON worker.id = branch_worker.worker_id
      SET branch_worker.role_id = worker.role_id
      WHERE branch_worker.role_id IS NULL
    `);

    await queryInterface.changeColumn('branch_workers', 'role_id', {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },
};
