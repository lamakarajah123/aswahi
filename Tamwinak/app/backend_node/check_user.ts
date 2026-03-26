import { sequelize } from './src/config/database';
import { User } from './src/models';

async function check() {
    try {
        await sequelize.authenticate();
        
        const userCount = await User.count();
        console.log('Total users:', userCount);
        
        const testUser = await User.findByPk('b44b97e8-8032-43bf-929b-654a2a315e6b');
        console.log('Store 8 owner:', JSON.stringify(testUser, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error('DB Check Fail:', e);
        process.exit(1);
    }
}

check();
