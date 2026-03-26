
import { sequelize } from './src/config/database';

async function check() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'order_items';");
        console.log('Columns in order_items:');
        results.forEach((row) => console.log(`- ${row.column_name}: ${row.data_type}`));
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}
check();
