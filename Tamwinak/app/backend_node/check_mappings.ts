import { sequelize } from './src/config/database';
import { StoreProduct } from './src/models';

async function check() {
    try {
        await sequelize.authenticate();
        
        const mappings = await StoreProduct.findAll({
            where: { product_id: 8 }
        });
        console.log('Mappings for product 8:', JSON.stringify(mappings, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error('DB Check Fail:', e);
        process.exit(1);
    }
}

check();
