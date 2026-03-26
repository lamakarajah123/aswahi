'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Roles Table
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: true },
      updated_at: { type: Sequelize.DATE, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    // 2. Users Table
    await queryInterface.createTable('users', {
      id: { type: Sequelize.STRING(255), primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false },
      name: { type: Sequelize.STRING(255), allowNull: true },
      role: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'user' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      last_login: { type: Sequelize.DATE, allowNull: true },
    });

    // 3. Stores Table
    await queryInterface.createTable('stores', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.STRING, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      address: { type: Sequelize.STRING, allowNull: false },
      latitude: { type: Sequelize.FLOAT, allowNull: false },
      longitude: { type: Sequelize.FLOAT, allowNull: false },
      phone: { type: Sequelize.STRING, allowNull: true },
      image_url: { type: Sequelize.STRING, allowNull: true },
      is_approved: { type: Sequelize.BOOLEAN, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: true },
      rating: { type: Sequelize.FLOAT, allowNull: true },
      total_ratings: { type: Sequelize.INTEGER, allowNull: true },
      commission_rate: { type: Sequelize.FLOAT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: true },
    });

    // 4. Products Table
    await queryInterface.createTable('products', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      price: { type: Sequelize.FLOAT, allowNull: false },
      image_url: { type: Sequelize.STRING, allowNull: true },
      category: { type: Sequelize.STRING, allowNull: true },
      unit: { type: Sequelize.STRING, allowNull: true },
      stock_quantity: { type: Sequelize.INTEGER, allowNull: true },
      is_available: { type: Sequelize.BOOLEAN, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: true },
    });

    // 5. Orders Table
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.STRING, allowNull: false },
      store_id: { type: Sequelize.INTEGER, allowNull: false },
      driver_id: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false },
      subtotal: { type: Sequelize.FLOAT, allowNull: false },
      delivery_fee: { type: Sequelize.FLOAT, allowNull: false },
      total: { type: Sequelize.FLOAT, allowNull: false },
      delivery_address: { type: Sequelize.STRING, allowNull: true },
      delivery_lat: { type: Sequelize.FLOAT, allowNull: true },
      delivery_lng: { type: Sequelize.FLOAT, allowNull: true },
      notes: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: true },
      updated_at: { type: Sequelize.DATE, allowNull: true },
    });

    // 6. Order Items Table
    await queryInterface.createTable('order_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.INTEGER, allowNull: false },
      product_name: { type: Sequelize.STRING, allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unit_price: { type: Sequelize.FLOAT, allowNull: false },
      subtotal: { type: Sequelize.FLOAT, allowNull: false },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('order_items');
    await queryInterface.dropTable('orders');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('stores');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('roles');
  }
};
