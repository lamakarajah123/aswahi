require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Adding sale_start and sale_end columns to store_products...');
        await client.query(`
            ALTER TABLE store_products 
            ADD COLUMN IF NOT EXISTS sale_start TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS sale_end TIMESTAMP WITH TIME ZONE;
        `);
        console.log('Migration successful!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

migrate();
