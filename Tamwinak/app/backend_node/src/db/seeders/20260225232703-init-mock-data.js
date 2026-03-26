'use strict';
const fs = require('fs');
const path = require('path');

const loadJSON = (filename) => {
  const filePath = path.resolve(__dirname, '../../../../backend/mock_data', filename);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return [];
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Load users explicitly to avoid FK errors
    const users = [
      { id: 'test-store-owner-1', email: 'owner1@test.com', name: 'Owner 1', role: 'store_owner', created_at: new Date() },
      { id: 'test-store-owner-2', email: 'owner2@test.com', name: 'Owner 2', role: 'store_owner', created_at: new Date() },
      { id: 'test-customer-1', email: 'customer1@test.com', name: 'Customer 1', role: 'customer', created_at: new Date() },
      { id: 'test-user-id', email: 'test@test.com', name: 'Test User', role: 'customer', created_at: new Date() }
    ];
    await queryInterface.bulkInsert('users', users, {});

    // 2. Roles
    let roles = loadJSON('roles.json');
    if (roles.length) {
      roles = roles.map(r => ({ ...r, created_at: new Date(r.created_at || new Date()), updated_at: new Date(r.updated_at || new Date()) }));
      await queryInterface.bulkInsert('roles', roles, {});
    }

    // 3. Permissions
    let permissions = loadJSON('permissions.json');
    if (permissions.length) {
      permissions = permissions.map(p => ({ ...p, created_at: new Date(p.created_at || new Date()) }));
      await queryInterface.bulkInsert('permissions', permissions, {});
    }

    // 4. Stores
    let stores = loadJSON('stores.json');
    if (stores.length) {
      stores = stores.map(s => ({ ...s, created_at: new Date(s.created_at || new Date()) }));
      await queryInterface.bulkInsert('stores', stores, {});
    }

    // 5. Products
    let products = loadJSON('products.json');
    if (products.length) {
      products = products.map(p => ({ ...p, created_at: new Date(p.created_at || new Date()) }));
      await queryInterface.bulkInsert('products', products, {});
    }

    // 6. Orders
    let orders = loadJSON('orders.json');
    if (orders.length) {
      // Map correctly to avoid items array if present under orders, orders has them inside typically or order_items separate
      const orderDocs = orders.map(o => {
        const doc = { ...o, created_at: new Date(o.created_at || new Date()), updated_at: new Date(o.updated_at || new Date()) };
        delete doc.items;
        return doc;
      });
      await queryInterface.bulkInsert('orders', orderDocs, {});

      // 7. Order Items
      let orderItems = [];
      orders.forEach(o => {
        if (o.items && Array.isArray(o.items)) {
          o.items.forEach(item => {
            orderItems.push({ ...item, order_id: o.id });
          });
        }
      });
      if (orderItems.length) {
        await queryInterface.bulkInsert('order_items', orderItems, {});
      }
    }

    // 8. App Settings
    let appSettings = loadJSON('app_settings.json');
    if (appSettings.length) {
      await queryInterface.bulkInsert('app_settings', appSettings, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('app_settings', null, {});
    await queryInterface.bulkDelete('order_items', null, {});
    await queryInterface.bulkDelete('orders', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('stores', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
