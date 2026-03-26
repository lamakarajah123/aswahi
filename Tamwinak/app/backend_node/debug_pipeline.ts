
import { Store, Product, StoreProduct } from './src/models';
import { connectDB } from './src/config/database';

async function debugData() {
    await connectDB();

    const approvedStores = await Store.findAll({ where: { is_approved: true, is_active: true } });
    console.log(`Approved Stores Count: ${approvedStores.length}`);
    approvedStores.forEach(s => console.log(` - Store ID: ${s.id}, Name: ${s.name}`));

    const storeIds = approvedStores.map(s => s.id);

    const links = await StoreProduct.findAll({
        where: { store_id: storeIds, is_available: true }
    });
    console.log(`Available Links Count: ${links.length}`);
    links.forEach(l => console.log(` - Link: Store ${l.store_id} <-> Product ${l.product_id}`));

    const productIds = links.map(l => l.product_id);
    console.log(`Unique Product IDs found in links: ${[...new Set(productIds)].join(', ')}`);

    const availableProducts = await Product.findAll({
        where: { id: productIds, is_available: true }
    });
    console.log(`Available Products in DB Count: ${availableProducts.length}`);
    availableProducts.forEach(p => console.log(` - Product ID: ${p.id}, Name: ${p.name}`));

    process.exit(0);
}

debugData();
