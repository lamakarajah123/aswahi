import { sequelize } from './src/config/database';

async function dropColumns() {
    const queries = [
        "ALTER TABLE product_units DROP COLUMN IF EXISTS stock_quantity",
        "ALTER TABLE product_units DROP COLUMN IF EXISTS discount_price",
        "ALTER TABLE product_units DROP COLUMN IF EXISTS discount_end_date",
        "ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity",
        "ALTER TABLE products DROP COLUMN IF EXISTS discount_price",
        "ALTER TABLE products DROP COLUMN IF EXISTS discount_end_date",
        "ALTER TABLE products DROP COLUMN IF EXISTS price",
        "ALTER TABLE products DROP COLUMN IF EXISTS unit",
    ];

    console.log('--- Dropping requested columns ---');
    for (const query of queries) {
        try {
            await sequelize.query(query);
            console.log(`Successfully executed: ${query}`);
        } catch (e: any) {
            console.warn(`Failed: ${query} - ${e.message}`);
        }
    }
}

dropColumns().catch(console.error).finally(() => process.exit());
