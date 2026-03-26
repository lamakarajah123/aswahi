'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add extra fields to product_units (IF NOT EXISTS — safe to re-run after partial failure)
    await queryInterface.sequelize.query(`ALTER TABLE product_units ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0`);
    await queryInterface.sequelize.query(`ALTER TABLE product_units ADD COLUMN IF NOT EXISTS discount_price FLOAT`);
    await queryInterface.sequelize.query(`ALTER TABLE product_units ADD COLUMN IF NOT EXISTS discount_end_date DATE`);

    // 2. Transfer existing stock and discount info from products (only if columns still exist)
    const [[{ col_exists }]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) > 0 AS col_exists
       FROM information_schema.columns
       WHERE table_name = 'products' AND column_name = 'discount_price'`
    );
    if (col_exists) {
      const [products] = await queryInterface.sequelize.query('SELECT id, stock_quantity, discount_price, discount_end_date FROM products');
      for (const p of products) {
        if (p.stock_quantity !== null || p.discount_price !== null) {
          await queryInterface.sequelize.query(
            'UPDATE product_units SET stock_quantity = :stock, discount_price = :discount, discount_end_date = :end_date WHERE product_id = :product_id',
            {
              replacements: {
                stock: p.stock_quantity || 0,
                discount: p.discount_price,
                end_date: p.discount_end_date,
                product_id: p.id
              }
            }
          );
        }
      }
    }

    // 3. Drop columns from products (IF EXISTS — safe to re-run after partial failure)
    await queryInterface.sequelize.query(`ALTER TABLE products DROP COLUMN IF EXISTS price`);
    await queryInterface.sequelize.query(`ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity`);
    await queryInterface.sequelize.query(`ALTER TABLE products DROP COLUMN IF EXISTS discount_price`);
    await queryInterface.sequelize.query(`ALTER TABLE products DROP COLUMN IF EXISTS discount_end_date`);
    await queryInterface.sequelize.query(`ALTER TABLE products DROP COLUMN IF EXISTS unit`);
  },

  async down(queryInterface, Sequelize) {
    // 1. Restore columns to products
    await queryInterface.addColumn('products', 'price', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('products', 'stock_quantity', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('products', 'discount_price', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('products', 'discount_end_date', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('products', 'unit', { type: Sequelize.STRING, allowNull: true });

    // 2. Clear product_units
    await queryInterface.removeColumn('product_units', 'stock_quantity');
    await queryInterface.removeColumn('product_units', 'discount_price');
    await queryInterface.removeColumn('product_units', 'discount_end_date');
  }
};
