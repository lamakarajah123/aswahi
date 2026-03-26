
import { sequelize } from './src/config/database';
import { OrderItem } from './src/models';

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected.');
        console.log('Syncing OrderItem table...');
        await OrderItem.sync({ alter: true });
        console.log('✅ OrderItem table synced.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}
check();
