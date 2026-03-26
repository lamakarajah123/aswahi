import { sequelize } from './src/config/database';
import { Category, Product } from './src/models';

async function fix() {
    try {
        await sequelize.authenticate();
        
        console.log('Fetching categories and products...');
        const categories = await Category.findAll();
        const products = await Product.findAll();
        
        console.log(`Found ${categories.length} categories and ${products.length} products.`);
        
        for (const product of products) {
            if (product.category) {
                const matchedCat = categories.find(c => c.name.toLowerCase() === product.category?.toLowerCase());
                if (matchedCat) {
                    console.log(`Linking product "${product.name}" to category "${matchedCat.name}"`);
                    await product.update({ category_id: matchedCat.id });
                } else {
                    console.log(`No category found for "${product.category}" on product "${product.name}", creating it...`);
                    const newCat = await Category.create({ 
                        name: product.category, 
                        is_active: true, 
                        sort_order: 0,
                        created_at: new Date()
                    } as any);
                    categories.push(newCat);
                    await product.update({ category_id: newCat.id });
                }
            }
        }
        
        console.log('Categorization fix complete.');
        process.exit(0);
    } catch (e) {
        console.error('Fix Fail:', e);
        process.exit(1);
    }
}

fix();
