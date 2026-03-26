import { Industry } from './src/models/Industry';
import { sequelize } from './src/config/database';

async function test() {
    try {
        const ind = await Industry.findAll();
        console.log(JSON.stringify(ind, null, 2));
    } catch (e) {
         console.error(e);
    } finally {
        await sequelize.close();
    }
}
test();
