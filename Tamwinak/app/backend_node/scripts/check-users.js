const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() =>
    c.query("SELECT column_name FROM information_schema.columns WHERE table_name='users'")
).then(r => { console.log(r.rows.map(x => x.column_name)); c.end(); })
    .catch(e => { console.error(e.message); c.end(); });
