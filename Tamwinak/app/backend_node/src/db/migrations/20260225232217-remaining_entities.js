'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Audit Logs Table
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.STRING, allowNull: false },
      action: { type: Sequelize.STRING, allowNull: false },
      target_type: { type: Sequelize.STRING, allowNull: true },
      target_id: { type: Sequelize.STRING, allowNull: true },
      details: { type: Sequelize.STRING, allowNull: true },
      ip_address: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: true },
    });

    // 2. Ratings Table
    await queryInterface.createTable('ratings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.STRING, allowNull: false },
      order_id: { type: Sequelize.INTEGER, allowNull: false },
      store_id: { type: Sequelize.INTEGER, allowNull: true },
      driver_id: { type: Sequelize.STRING, allowNull: true },
      store_rating: { type: Sequelize.INTEGER, allowNull: true },
      driver_rating: { type: Sequelize.INTEGER, allowNull: true },
      comment: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: true },
    });

    // 3. App Settings Table
    await queryInterface.createTable('app_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING, allowNull: false },
      value: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('app_settings');
    await queryInterface.dropTable('ratings');
    await queryInterface.dropTable('audit_logs');
  }
};
