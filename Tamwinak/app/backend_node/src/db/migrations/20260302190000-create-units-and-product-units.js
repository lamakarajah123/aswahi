'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create units table
    await queryInterface.createTable('units', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name_ar: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    });

    // 2. Create product_units junction table
    await queryInterface.createTable('product_units', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
      },
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'units', key: 'id' },
        onDelete: 'CASCADE',
      },
      price: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('product_units', ['product_id']);
    await queryInterface.addIndex('product_units', ['unit_id']);

    // 3. Seed default units
    await queryInterface.bulkInsert('units', [
      { name: 'Piece', name_ar: 'قطعة', is_active: true },
      { name: 'Kilogram', name_ar: 'كيلوغرام', is_active: true },
      { name: 'Gram', name_ar: 'غرام', is_active: true },
      { name: 'Liter', name_ar: 'لتر', is_active: true },
      { name: 'Milliliter', name_ar: 'ميليلتر', is_active: true },
      { name: 'Box', name_ar: 'صندوق', is_active: true },
      { name: 'Bag', name_ar: 'كيس', is_active: true },
      { name: 'Dozen', name_ar: 'دزينة', is_active: true },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_units');
    await queryInterface.dropTable('units');
  },
};
