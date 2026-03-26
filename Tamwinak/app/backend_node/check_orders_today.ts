import { sequelize } from './src/config/database';
import { Order } from './src/models';
import { Op } from 'sequelize';

async function check() {
    try {
        await sequelize.authenticate();
        
        const today = new Date();
        today.setHours(0,0,0,0);

        const orders = await Order.findAll({
            where: {
                created_at: { [Op.gte]: today }
            }
        });
        console.log('Orders Today:', JSON.stringify(orders, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error('DB Check Fail:', e);
        process.exit(1);
    }
}

check();
