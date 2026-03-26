
const { Store, Product, StoreProduct, ProductUnit, Unit } = require('./src/models');

async function fixProducts() {
    try {
        console.log('Starting product fix...');

        // 1. Link products to stores if they aren't linked
        const products = await Product.findAll();
        const stores = await Store.findAll();

        if (stores.length === 0) {
            console.log('No stores found to link products to.');
            return;
        }

        for (const product of products) {
            // Check if product is linked to any store
            const links = await StoreProduct.count({ where: { product_id: product.id } });
            if (links === 0) {
                // Link to the first store found (or a specific one if needed)
                // For now, let's link to help the user see their products
                await StoreProduct.create({
                    store_id: stores[0].id,
                    product_id: product.id,
                    is_available: true,
                    added_at: new Date()
                });
                console.log(`Linked product ${product.id} (${product.name}) to store ${stores[0].id}`);
            }

            // 2. Ensure product has at least one unit/price
            const units = await ProductUnit.count({ where: { product_id: product.id } });
            if (units === 0) {
                let unitRecord = await Unit.findOne({ where: { name: 'each' } });
                if (!unitRecord) {
                    unitRecord = await Unit.create({ name: 'each', is_active: true });
                }
                await ProductUnit.create({
                    product_id: product.id,
                    unit_id: unitRecord.id,
                    price: 10.0 // Default price to avoid 0
                });
                console.log(`Created default unit for product ${product.id}`);
            }
        }

        console.log('Fix completed.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixProducts();
