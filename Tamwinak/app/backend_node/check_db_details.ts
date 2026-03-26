import { sequelize } from './src/config/database';
import { User, Store, Order } from './src/models';

async function check() {
    try {
        await sequelize.authenticate();
        
        const stores = await Store.findAll({
            attributes: ['id', 'name', 'user_id', 'is_approved', 'is_accepting_orders']
        });
        console.log('Stores:', JSON.stringify(stores, null, 2));

        const recentOrders = await Order.findAll({
            limit: 5,
            order: [['created_at', 'DESC']],
            attributes: ['id', 'store_id', 'user_id', 'status', 'total', 'created_at']
        });
        console.log('Recent Orders:', JSON.stringify(recentOrders, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error('DB Check Fail:', e);
        process.exit(1);
    }
}

check();
