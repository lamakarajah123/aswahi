import { Store, Product, StoreProduct } from './src/models';
import { connectDB } from './src/config/database';

async function check() {
    await connectDB();
    const storeCount = await Store.count({ where: { is_approved: true, is_active: true } });
    const productCount = await Product.count({ where: { is_available: true } });
    const linkCount = await StoreProduct.count({ where: { is_available: true } });
    console.log('Approved & Active Stores:', storeCount);
    console.log('Available Products:', productCount);
    console.log('Available Store-Product Links:', linkCount);

    if (storeCount > 0) {
        const stores = await Store.findAll({ where: { is_approved: true, is_active: true } });
        console.log('Sample Store Coords:', stores.map(s => ({ lat: s.latitude, lng: s.longitude })));
    }
}

check();
