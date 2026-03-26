const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(() => {
    return c.query(`
    UPDATE stores SET
      latitude = CASE id
        WHEN 1 THEN 32.2211
        WHEN 2 THEN 32.2189
        ELSE latitude
      END,
      longitude = CASE id
        WHEN 1 THEN 35.2544
        WHEN 2 THEN 35.2601
        ELSE longitude
      END,
      address = CASE id
        WHEN 1 THEN 'Al-Qasabah Street, Nablus, Palestine'
        WHEN 2 THEN 'Rafidia Street, Nablus, Palestine'
        ELSE address
      END
    WHERE id IN (1, 2)
  `);
}).then(r => {
    console.log('Updated rows:', r.rowCount);
    c.end();
}).catch(e => {
    console.error(e.message);
    c.end();
});
