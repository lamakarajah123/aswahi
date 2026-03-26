const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('postgres://postgres:1234@localhost:5432/tamwinak', { logging: false });
const Language = sequelize.define('Language', { translations: DataTypes.JSONB }, { tableName: 'languages', timestamps: true });

async function fix() {
  const langs = await Language.findAll();
  for(const lang of langs) {
    let changed = false;
    const tr = lang.get('translations');
    const newTr = {};
    for (const key in tr) {
      newTr[key] = tr[key];
      if (typeof tr[key] === 'string') {
        if (tr[key].includes('تموينك')) {
          newTr[key] = newTr[key].replace(/تموينك/g, 'أسواحي');
          changed = true;
        }
        if (tr[key].includes('Tamwinak')) {
          newTr[key] = newTr[key].replace(/Tamwinak/ig, 'Aswahi');
          changed = true;
        }
        if (tr[key].includes('Tamweenak')) {
          newTr[key] = newTr[key].replace(/Tamweenak/ig, 'Aswahi');
          changed = true;
        }
      }
    }
    
    // Explicitly set `app.title` as fallback
    if (lang.get('id') === 1) { // presumably Arabic
       newTr['app.title'] = 'أسواحي';
       changed = true;
    }
    if (lang.get('id') === 2 || lang.get('code') === 'en') {
       newTr['app.title'] = 'Aswahi';
       changed = true;
    }

    if (changed) {
      lang.set('translations', newTr);
      lang.changed('translations', true);
      await lang.save();
      console.log('Updated language', lang.get('id'));
    }
  }
  console.log('Done');
  process.exit(0);
}
fix();
