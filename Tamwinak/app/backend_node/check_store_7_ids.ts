import { sequelize } from './src/config/database';
import { StoreProduct } from './src/models';

async function check() {
    try {
        await sequelize.authenticate();
        
        const mappings = await StoreProduct.findAll({
            where: { store_id: 7 }
        });
        console.log('Product IDs in Store 7:', JSON.stringify(mappings.map(m => m.product_id), null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error('DB Check Fail:', e);
        process.exit(1);
    }
}

check();
