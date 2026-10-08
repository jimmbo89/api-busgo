'use strict';

const { QueryTypes } = require('sequelize');

const LEGACY_ROLE_TYPE = 'Sistema';
const COMPANY_ROLE_TYPE = 'Empresa';
const BRANCH_ROLE_TYPE = 'Sucursal';

module.exports = {
  async up(queryInterface, Sequelize) {
    const invalidRoleTypes = await queryInterface.sequelize.query(
      `SELECT DISTINCT type
       FROM roles
       WHERE type IS NOT NULL
         AND type NOT IN (:legacyType, :companyType, :branchType)`,
      {
        replacements: {
          legacyType: LEGACY_ROLE_TYPE,
          companyType: COMPANY_ROLE_TYPE,
          branchType: BRANCH_ROLE_TYPE,
        },
        type: QueryTypes.SELECT,
      }
    );

    if (invalidRoleTypes.length > 0) {
      const values = invalidRoleTypes.map((row) => row.type || '<null>').join(', ');
      throw new Error(`InvalidRoleTypesBeforeMigration:${values}`);
    }

    await queryInterface.bulkUpdate(
      'roles',
      { type: COMPANY_ROLE_TYPE },
      { type: LEGACY_ROLE_TYPE }
    );

    await queryInterface.bulkUpdate(
      'roles',
      { type: COMPANY_ROLE_TYPE },
      { type: null }
    );

    await queryInterface.changeColumn('roles', 'type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: COMPANY_ROLE_TYPE,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate(
      'roles',
      { type: LEGACY_ROLE_TYPE },
      { type: COMPANY_ROLE_TYPE }
    );

    await queryInterface.changeColumn('roles', 'type', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: LEGACY_ROLE_TYPE,
    });
  },
};
