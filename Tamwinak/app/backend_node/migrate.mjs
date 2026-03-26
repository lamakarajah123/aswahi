import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();
const s = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: true });

console.log('Creating missing tables...');

await s.query(`
  CREATE TABLE IF NOT EXISTS industries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`);
console.log('✅ industries table created');

await s.query(`
  CREATE TABLE IF NOT EXISTS store_industries (
    store_id INTEGER NOT NULL,
    industry_id INTEGER NOT NULL,
    PRIMARY KEY (store_id, industry_id),
    FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE
  );
`);
console.log('✅ store_industries table created');

await s.query(`
  CREATE TABLE IF NOT EXISTS store_products (
    store_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    is_available BOOLEAN DEFAULT true,
    price_override FLOAT,
    PRIMARY KEY (store_id, product_id)
  );
`);
console.log('✅ store_products table created');

// Add industry_id to products if it doesn't exist
const [cols] = await s.query("SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='industry_id'");
if (cols.length === 0) {
    await s.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL;`);
    console.log('✅ industry_id column added to products');
} else {
    console.log('ℹ️  industry_id already exists in products');
}

// Seed some default industries if the table is empty
const [existing] = await s.query("SELECT COUNT(*) as cnt FROM industries");
if (existing[0].cnt === '0') {
    await s.query(`
    INSERT INTO industries (name, name_ar, icon, description) VALUES
    ('Grocery', 'بقالة', '🛒', 'Supermarkets and grocery stores'),
    ('Bakery', 'مخبز', '🥖', 'Bakeries and pastries'),
    ('Restaurant', 'مطعم', '🍽️', 'Restaurants and food outlets'),
    ('Pharmacy', 'صيدلية', '💊', 'Pharmacies and health products'),
    ('Electronics', 'إلكترونيات', '📱', 'Electronics and gadgets'),
    ('Fruits & Vegetables', 'خضار وفواكه', '🥦', 'Fresh produce');
  `);
    console.log('✅ Default industries seeded');
}

const [tables] = await s.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('industries','store_products','store_industries')");
console.log('Created tables:', tables.map(r => r.table_name).join(', '));

await s.close();
console.log('Done!');
