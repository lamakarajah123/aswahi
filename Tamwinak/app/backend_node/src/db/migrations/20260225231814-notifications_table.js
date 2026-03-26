'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.STRING, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      title: { type: Sequelize.STRING, allowNull: false },
      body: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false },
      order_id: { type: Sequelize.INTEGER, allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: true },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
  }
};
