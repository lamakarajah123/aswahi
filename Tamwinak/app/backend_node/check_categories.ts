
import { Product } from './src/models';
import { connectDB } from './src/config/database';

async function checkCategories() {
    await connectDB();
    const products = await Product.findAll();
    products.forEach(p => console.log(`Product: ${p.name}, Category: "${p.category}"`));
    process.exit(0);
}

checkCategories();
