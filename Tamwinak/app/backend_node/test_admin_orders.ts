import { sequelize } from './src/config/database';
import { Order, OrderItem, Store } from './src/models';

async function test() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');
        
        const { count, rows: orders } = await Order.findAndCountAll({
            order: [['created_at', 'DESC']],
            limit: 5,
            offset: 0,
            include: [
                { model: OrderItem, as: 'items' },
                { model: Store, as: 'store', attributes: ['id', 'name'] },
            ],
        });

        console.log('Orders Count:', count);
        console.log('Orders Fetched:', orders.length);
        if (orders.length > 0) {
            console.log('First Order Items:', orders[0].items?.length);
            console.log('First Order Store:', (orders[0] as any).store?.name);
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Test Fail:', e);
        process.exit(1);
    }
}

test();
