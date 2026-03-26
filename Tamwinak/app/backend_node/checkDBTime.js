import { sequelize } from './src/config/database.js';
import { QueryTypes } from 'sequelize';

async function checkTime() {
    try {
        const results = await sequelize.query(`
            SELECT NOW() as db_now, CURRENT_TIMESTAMP as db_ts, (SELECT timezone FROM pg_settings WHERE name = 'TimeZone') as tz;
        `, { type: QueryTypes.SELECT });
        console.log('DB TIME REPORT:', JSON.stringify(results[0], null, 2));
        console.log('NODE TIME:', new Date().toISOString());
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkTime();
