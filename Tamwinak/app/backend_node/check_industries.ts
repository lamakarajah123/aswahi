
import { Product, Industry } from './src/models';
import { connectDB } from './src/config/database';

async function checkIndustries() {
    await connectDB();
    const products = await Product.findAll();
    console.log('--- Products Industry IDs ---');
    products.forEach(p => console.log(`Product "${p.name}" (ID ${p.id}), Industry ID: ${p.industry_id}`));

    const industries = await Industry.findAll();
    console.log('--- Industries List ---');
    industries.forEach(i => console.log(`Industry "${i.name}" (ID ${i.id})`));

    process.exit(0);
}

checkIndustries();
