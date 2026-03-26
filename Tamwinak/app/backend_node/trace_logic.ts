
import { Store, Product, StoreProduct, Industry, ProductUnit, Unit } from './src/models';
import { connectDB } from './src/config/database';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dlat = ((lat2 - lat1) * Math.PI) / 180;
    const dlon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dlat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dlon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

async function testNearby() {
    await connectDB();
    const lat = 32.2211;
    const lng = 35.2544;
    const radius = 15;

    console.log('--- TEST START ---');
    const stores = await Store.findAll({ where: { is_approved: true, is_active: true } });
    console.log(`Step 1: Found ${stores.length} approved/active stores.`);

    const nearbyStores = stores.filter((s) => {
        const d = haversineDistance(lat, lng, s.latitude, s.longitude);
        console.log(` - Store ${s.id} distance: ${d.toFixed(2)} km`);
        return d <= radius;
    });
    const nearbyStoreIds = nearbyStores.map(s => s.id);
    console.log(`Step 2: Nearby Store IDs: ${nearbyStoreIds.join(', ')}`);

    if (nearbyStoreIds.length === 0) {
        console.log('!!! NO NEARBY STORES !!!');
        process.exit(0);
    }

    const storeProductLinks = await StoreProduct.findAll({
        where: { store_id: nearbyStoreIds, is_available: true },
    });
    console.log(`Step 3: Found ${storeProductLinks.length} available store-product links.`);

    const productIds = storeProductLinks.map(sp => sp.product_id);
    const uniqueProductIds = [...new Set(productIds)];
    console.log(`Step 4: Unique Product IDs: ${uniqueProductIds.join(', ')}`);

    const products = await Product.findAll({
        where: { id: uniqueProductIds, is_available: true },
        include: [
            { model: Industry, as: 'industry', attributes: ['id', 'name', 'name_ar', 'icon'] },
            {
                model: ProductUnit,
                as: 'product_units',
                include: [{ model: Unit, as: 'unit', attributes: ['name', 'name_ar'] }]
            }
        ],
    });
    console.log(`Step 5: Final Products Count: ${products.length}`);
    products.forEach(p => console.log(` - Product ${p.id}: ${p.name}, Units: ${(p as any).product_units?.length}`));

    process.exit(0);
}

testNearby();
