import { sequelize } from './src/config/database';
import { Store } from './src/models';

async function fix() {
    try {
        await sequelize.authenticate();
        
        console.log('Updating store locations to Nablus...');
        // Nablus coordinates: 32.2211, 35.2544
        await Store.update(
            { latitude: 32.2211, longitude: 35.2544 },
            { where: {} }
        );
        
        console.log('Stores updated successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Fix Fail:', e);
        process.exit(1);
    }
}

fix();
