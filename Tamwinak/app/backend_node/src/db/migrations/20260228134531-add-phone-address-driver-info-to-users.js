'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = [
      { name: 'phone', type: Sequelize.STRING(50) },
      { name: 'address', type: Sequelize.STRING(255) },
      { name: 'work_area', type: Sequelize.STRING(255) },
      { name: 'working_hours', type: Sequelize.STRING(100) },
      { name: 'vehicle_type', type: Sequelize.STRING(50) },
    ];

    for (const col of columns) {
      try {
        await queryInterface.addColumn('users', col.name, {
          type: col.type,
          allowNull: true,
        });
      } catch (e) {
        console.warn(`Column "${col.name}" already exists in "users" table, skipping.`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'phone');
    await queryInterface.removeColumn('users', 'address');
    await queryInterface.removeColumn('users', 'work_area');
    await queryInterface.removeColumn('users', 'working_hours');
    await queryInterface.removeColumn('users', 'vehicle_type');
  }
};
