require('dotenv').config();
const { Store, StoreGroup } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function debug() {
    try {
        const stores = await Store.findAll({ 
            attributes: ['id', 'name', 'group_id'], 
            raw: true 
        });
        const groups = await StoreGroup.findAll({
            attributes: ['id', 'name'],
            raw: true
        });
        console.log('--- GROUPS ---');
        console.table(groups);
        console.log('--- STORES ---');
        console.table(stores);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

debug();
