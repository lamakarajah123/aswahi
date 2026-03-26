const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
    // Check what Sequelize would generate
    const r1 = await c.query("SELECT * FROM stores WHERE is_approved = true AND is_active = true");
    console.log('Filtered rows:', r1.rows.length, r1.rows.map(r => ({ id: r.id, name: r.name, lat: r.latitude, lng: r.longitude })));
    c.end();
}).catch(e => { console.error(e.message); c.end(); });
