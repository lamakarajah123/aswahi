import { sequelize } from './src/config/database';
import { Product, Store, StoreProduct } from './src/models';

async function check() {
    try {
        await sequelize.authenticate();
        
        const productsRaw = await sequelize.query('SELECT id, name, category, category_id, is_available FROM products LIMIT 5', { type: 'SELECT' });
        console.log('Sample Products:', JSON.stringify(productsRaw, null, 2));

        const storesRaw = await sequelize.query('SELECT id, name, is_active, is_approved, is_accepting_orders FROM stores', { type: 'SELECT' });
        console.log('All Stores:', JSON.stringify(storesRaw, null, 2));

        const mappingsCount = await StoreProduct.count();
        console.log('Total store_products mappings:', mappingsCount);
        
        process.exit(0);
    } catch (e) {
        console.error('Check Fail:', e);
        process.exit(1);
    }
}

check();
