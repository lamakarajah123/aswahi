import { sequelize } from './src/config/database';
import { Unit, Product, ProductUnit } from './src/models';

async function check() {
    try {
        const units = await Unit.findAll();
        console.log('--- Current Units ---');
        units.forEach(u => console.log(`${u.id}: ${u.name} (${u.name_ar})`));

        const products = await Product.findAll({ limit: 5 });
        console.log(`\nTotal Products: ${await Product.count()}`);
        console.log('--- Sample Products ---');
        for (const p of products) {
            const pus = await ProductUnit.findAll({ where: { product_id: p.id }, include: ['unit'] });
            console.log(`Product ${p.id}: ${p.name}`);
            pus.forEach(pu => {
                const unitName = (pu as any).unit?.name || 'Unknown';
                console.log(`  - Unit: ${unitName}, Price: ${pu.price}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

check();
