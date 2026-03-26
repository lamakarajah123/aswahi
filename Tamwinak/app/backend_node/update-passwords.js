const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/tamwinak' });

async function run() {
    await client.connect();
    // Use the password that is expected on the frontend
    const hash = await bcrypt.hash('Password123!', 12);
    
    // Update all users to have this password hash
    await client.query('UPDATE users SET password_hash = $1', [hash]);
    
    console.log('Passwords updated successfully!');
    await client.end();
}

run().catch(console.error);
