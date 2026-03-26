import { sequelize } from './src/config/database';
async function update() {
  try {
     await sequelize.query('ALTER TABLE industries ADD COLUMN image_url TEXT');
     console.log('done');
  } catch(e) { console.error('error', e); }
  await sequelize.close();
}
update();
