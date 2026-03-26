'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const changes = [
      { table: 'stores', field: 'description', type: Sequelize.TEXT },
      { table: 'stores', field: 'image_url', type: Sequelize.TEXT },
      { table: 'products', field: 'description', type: Sequelize.TEXT },
      { table: 'products', field: 'image_url', type: Sequelize.TEXT },
    ];

    for (const item of changes) {
      try {
        await queryInterface.changeColumn(item.table, item.field, {
          type: item.type,
          allowNull: true
        });
      } catch (e) {
        console.warn(`Could not change column ${item.field} in ${item.table}: ${e.message}`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('stores', 'description', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.changeColumn('stores', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.changeColumn('products', 'description', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.changeColumn('products', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
