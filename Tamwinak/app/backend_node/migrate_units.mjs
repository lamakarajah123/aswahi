import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config({ path: 'src/.env' }); // try pointing to .env
if (!process.env.DATABASE_URL) dotenv.config();

const s = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: true });

console.log('Creating units tables...');

await s.query(`
  CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    is_active BOOLEAN DEFAULT true
  );
`);
console.log('✅ units table created');

await s.query(`
  CREATE TABLE IF NOT EXISTS product_units (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    price FLOAT NOT NULL
  );
`);
console.log('✅ product_units table created');

// Seed some default units
const [existing] = await s.query("SELECT COUNT(*) as cnt FROM units");
if (existing[0].cnt === '0') {
    await s.query(`
    INSERT INTO units (name, name_ar, is_active) VALUES
    ('Kg', 'كغم', true),
    ('Gram', 'غرام', true),
    ('Piece', 'قطعة', true),
    ('Box', 'صندوق', true),
    ('Dozen', 'درزينة', true),
    ('Liter', 'لتر', true),
    ('Pack', 'عبوة', true);
  `);
    console.log('✅ Default units seeded');
}

const [tables] = await s.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('units','product_units')");
console.log('Created tables:', tables.map(r => r.table_name).join(', '));

await s.close();
console.log('Done!');
