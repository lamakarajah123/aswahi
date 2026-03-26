import { sequelize } from './src/config/database';

async function check() {
    const [p] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products'");
    const [pu] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_units'");

    console.log('--- PRODUCTS COLUMNS ---');
    console.log(p.map((r: any) => r.column_name).join(', '));

    console.log('--- PRODUCT_UNITS COLUMNS ---');
    console.log(pu.map((r: any) => r.column_name).join(', '));
}

check().catch(console.error).finally(() => process.exit());
