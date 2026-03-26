import { sequelize } from './src/config/database';

async function migrate() {
    try {
        console.log('--- Starting Migration ---');

        // 1. Add columns to product_units
        console.log('Adding columns to product_units...');
        await sequelize.query('ALTER TABLE product_units ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0');
        await sequelize.query('ALTER TABLE product_units ADD COLUMN IF NOT EXISTS discount_price FLOAT');
        await sequelize.query('ALTER TABLE product_units ADD COLUMN IF NOT EXISTS discount_end_date DATE');

        // 2. Transfer data
        console.log('Transferring stock and discount data from products to product_units...');
        const [products]: [any[], any] = await sequelize.query('SELECT id, stock_quantity, discount_price, discount_end_date FROM products');
        for (const p of products) {
            // Only update if there is data to copy
            if (p.stock_quantity !== null || p.discount_price !== null) {
                await sequelize.query(
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

        // 3. Remove columns from products
        console.log('Removing columns from products...');
        await sequelize.query('ALTER TABLE products DROP COLUMN IF EXISTS price');
        await sequelize.query('ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity');
        await sequelize.query('ALTER TABLE products DROP COLUMN IF EXISTS discount_price');
        await sequelize.query('ALTER TABLE products DROP COLUMN IF EXISTS discount_end_date');
        await sequelize.query('ALTER TABLE products DROP COLUMN IF EXISTS unit');

        console.log('--- Migration Finished Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
