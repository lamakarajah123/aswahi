'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = [
      { name: 'working_hours', type: Sequelize.STRING(100) },
      { name: 'is_accepting_orders', type: Sequelize.BOOLEAN, defaultValue: true },
    ];

    for (const col of columns) {
      try {
        await queryInterface.addColumn('stores', col.name, {
          type: col.type,
          allowNull: true,
          defaultValue: col.defaultValue !== undefined ? col.defaultValue : null,
        });
      } catch (e) {
        console.warn(`Column "${col.name}" already exists in "stores" table, skipping.`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('stores', 'working_hours');
    await queryInterface.removeColumn('stores', 'is_accepting_orders');
  }
};
