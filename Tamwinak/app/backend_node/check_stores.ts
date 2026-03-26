import { sequelize } from './src/config/database';
import { Store } from './src/models';

async function check() {
    try {
        await sequelize.authenticate();
        
        const stores = await Store.findAll({
            attributes: ['id', 'name', 'is_active', 'is_approved', 'is_accepting_orders']
        });
        console.log('Stores detailed:', JSON.stringify(stores, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error('DB Check Fail:', e);
        process.exit(1);
    }
}

check();
