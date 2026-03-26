'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Permissions Table
    await queryInterface.createTable('permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      module: { type: Sequelize.STRING, allowNull: false },
      action: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: true },
    });

    // 2. Role Permissions Table
    await queryInterface.createTable('role_permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      role_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'roles', key: 'id' }, onDelete: 'CASCADE' },
      permission_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'permissions', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: true },
    });

    // 3. User Roles Table
    await queryInterface.createTable('user_roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.STRING(255), allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      role_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'roles', key: 'id' }, onDelete: 'CASCADE' },
      assigned_at: { type: Sequelize.DATE, allowNull: true },
      assigned_by: { type: Sequelize.STRING, allowNull: true },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('permissions');
  }
};
