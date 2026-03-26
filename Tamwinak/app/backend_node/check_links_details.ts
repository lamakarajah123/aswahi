
import { StoreProduct, Product, Store } from './src/models';
import { connectDB } from './src/config/database';

async function checkLinks() {
    await connectDB();
    const links = await StoreProduct.findAll({
        include: [
            { model: Product, as: 'product' },
            { model: Store, as: 'store' }
        ]
    });

    console.log(`--- Store-Product Links (${links.length}) ---`);
    links.forEach(l => {
        const p = (l as any).product;
        const s = (l as any).store;
        console.log(`Link: Store "${s?.name}" (ID ${l.store_id}) <-> Product "${p?.name}" (ID ${l.product_id}), Available: ${l.is_available}`);
    });
    process.exit(0);
}

checkLinks();
