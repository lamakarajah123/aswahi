'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableFields = [
      { table: 'product_units', field: 'stock_quantity' },
      { table: 'product_units', field: 'discount_price' },
      { table: 'product_units', field: 'discount_end_date' },
      { table: 'products', field: 'stock_quantity' },
      { table: 'products', field: 'discount_price' },
      { table: 'products', field: 'discount_end_date' },
      { table: 'products', field: 'price' },
      { table: 'products', field: 'unit' },
    ];

    for (const item of tableFields) {
      try {
        await queryInterface.removeColumn(item.table, item.field);
      } catch (e) {
        // Ignore if column doesn't exist
      }
    }
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
