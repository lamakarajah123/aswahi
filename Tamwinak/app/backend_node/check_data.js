
const { Store, Product, StoreProduct } = require('./src/models');

async function checkData() {
    try {
        const stores = await Store.findAll();
        console.log('Stores:', stores.map(s => ({
            id: s.id,
            name: s.name,
            is_approved: s.is_approved,
            is_active: s.is_active,
            lat: s.latitude,
            lng: s.longitude
        })));

        const products = await Product.findAll();
        console.log('Total Products:', products.length);

        const storeProducts = await StoreProduct.findAll();
        console.log('Store-Product Links:', storeProducts.length);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
