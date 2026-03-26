import { sequelize } from './src/config/database';

async function check() {
    try {
        const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'group_id'");
        if (results.length > 0) {
            console.log('COLUMN EXISTS');
        } else {
            console.log('COLUMN MISSING - ADDING IT');
            await sequelize.query('ALTER TABLE stores ADD COLUMN group_id INTEGER REFERENCES store_groups(id) ON DELETE SET NULL');
            console.log('COLUMN ADDED');
        }
    } catch (e) {
        console.error('ERROR CHECKING COLUMN:', e);
    } finally {
        await sequelize.close();
    }
}

check();
