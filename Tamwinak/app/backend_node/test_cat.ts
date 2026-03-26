import { Category } from './src/models/Category';
import { sequelize } from './src/config/database';

async function test() {
    try {
        const cat = await Category.findAll();
        console.log(JSON.stringify(cat, null, 2));
    } catch (e) {
         console.error(e);
    } finally {
        await sequelize.close();
    }
}
test();
