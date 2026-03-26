const { StoreProduct } = require('./src/models');

async function check() {
    const sps = await StoreProduct.findAll();
    console.log(JSON.stringify(sps, null, 2));
    process.exit(0);
}
check();
