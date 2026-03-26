
import { sequelize } from './src/config/database';

async function check() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query("SELECT * FROM order_items ORDER BY id DESC LIMIT 5;");
        console.log('Latest Order Items:');
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}
check();
