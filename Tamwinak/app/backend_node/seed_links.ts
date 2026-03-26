import { Store, Product, StoreProduct } from './src/models';
import { connectDB } from './src/config/database';

async function seedLinks() {
    try {
        console.log('⏳ Connecting to database...');
        await connectDB();

        const stores = await Store.findAll({ where: { is_approved: true, is_active: true } });
        const products = await Product.findAll({ where: { is_available: true } });

        console.log(`📊 Found ${stores.length} stores and ${products.length} products.`);

        for (const store of stores) {
            for (const product of products) {
                // findOrCreate expects defaults for all non-optional attributes if they are not in 'where'
                const [link, created] = await StoreProduct.findOrCreate({
                    where: {
                        store_id: store.id,
                        product_id: product.id
                    },
                    defaults: {
                        is_available: true,
                        override_price: null,
                        added_at: new Date()
                    }
                });

                if (!created && !link.is_available) {
                    link.is_available = true;
                    await link.save();
                    console.log(`✅ Updated: Product ${product.id} in Store ${store.id}`);
                } else if (created) {
                    console.log(`🆕 Linked: Product ${product.id} to Store ${store.id}`);
                }
            }
        }
        console.log('✅ Finished seeding links successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding links:', error);
        process.exit(1);
    }
}

seedLinks();
