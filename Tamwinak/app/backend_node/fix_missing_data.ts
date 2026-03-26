
import { Store, Product, StoreProduct, ProductUnit, Unit } from './src/models';
import { connectDB } from './src/config/database';

async function fixAll() {
    try {
        console.log('🚀 Connecting to database...');
        await connectDB();

        // 1. Approve all stores and set them as active
        console.log('🏪 Approving all stores...');
        await Store.update(
            { is_approved: true, is_active: true, is_accepting_orders: true },
            { where: {} }
        );

        const stores = await Store.findAll();
        console.log(`✅ Approved ${stores.length} stores.`);

        if (stores.length === 0) {
            console.log('⚠️ No stores found. Please create a store first.');
            process.exit(0);
        }

        const firstStoreId = stores[0].id;

        // 2. Make all products available
        console.log('📦 Making all products available...');
        await Product.update(
            { is_available: true },
            { where: {} }
        );

        const products = await Product.findAll();
        console.log(`✅ Found ${products.length} products.`);

        // 3. Link products to stores and ensure units exist
        for (const product of products) {
            // Link to the first store if no links exist
            const linkCount = await StoreProduct.count({ where: { product_id: product.id } });
            if (linkCount === 0) {
                await StoreProduct.create({
                    store_id: firstStoreId,
                    product_id: product.id,
                    is_available: true,
                    added_at: new Date()
                } as any);
                console.log(`🔗 Linked product "${product.name}" to store ID ${firstStoreId}`);
            } else {
                // Ensure existing links are available
                await StoreProduct.update(
                    { is_available: true },
                    { where: { product_id: product.id } }
                );
            }

            // Ensure ProductUnit exists for pricing
            const unitCount = await ProductUnit.count({ where: { product_id: product.id } });
            if (unitCount === 0) {
                let unitRecord = await Unit.findOne({ where: { name: 'each' } });
                if (!unitRecord) {
                    unitRecord = await Unit.create({ name: 'each', is_active: true } as any);
                }
                await ProductUnit.create({
                    product_id: product.id,
                    unit_id: unitRecord.id,
                    price: 15.0 // Default price
                } as any);
                console.log(`💰 Added default price for "${product.name}"`);
            }
        }

        console.log('✨ All fixes applied! Products should now be visible on the home page.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during fix:', err);
        process.exit(1);
    }
}

fixAll();
