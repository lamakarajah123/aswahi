import { sequelize } from './src/config/database';
import { Order } from './src/models';

async function check() {
    try {
        await sequelize.authenticate();
        
        const latestOrder = await Order.findOne({
            order: [['id', 'DESC']]
        });
        console.log('Latest Order:', JSON.stringify(latestOrder, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error('DB Check Fail:', e);
        process.exit(1);
    }
}

check();
