'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Get all products (price column was removed — derive base price from existing product_units or use default)
        const [products] = await queryInterface.sequelize.query('SELECT id FROM products');

        // 2. Get all units
        const [units] = await queryInterface.sequelize.query('SELECT id, name FROM units WHERE is_active = true');

        if (products.length === 0 || units.length === 0) {
            console.log('No products or units found.');
            return;
        }

        const productUnits = [];

        for (const prod of products) {
            // Check existing units for this product
            const [existing] = await queryInterface.sequelize.query(
                'SELECT unit_id, price FROM product_units WHERE product_id = :product_id',
                { replacements: { product_id: prod.id } }
            );

            const existingIds = existing.map(e => e.unit_id);
            // Use average of existing prices, or default to 1.00
            const basePrice = existing.length > 0
                ? existing.reduce((sum, e) => sum + parseFloat(e.price || 1), 0) / existing.length
                : 1.00;

            // We need at least 2 units total.
            let count = existingIds.length;

            for (const unit of units) {
                if (count >= 2) break;
                if (!existingIds.includes(unit.id)) {
                    let price = basePrice;
                    if (unit.name.toLowerCase().includes('box')) {
                        price = basePrice * 10;
                    } else if (unit.name.toLowerCase().includes('dozen')) {
                        price = basePrice * 12;
                    } else if (unit.name.toLowerCase().includes('pack')) {
                        price = basePrice * 5;
                    }

                    productUnits.push({
                        product_id: prod.id,
                        unit_id: unit.id,
                        price: parseFloat(price.toFixed(2))
                    });
                    count++;
                }
            }
        }

        if (productUnits.length > 0) {
            await queryInterface.bulkInsert('product_units', productUnits, {});
        }

        console.log(`Added ${productUnits.length} product-unit entries.`);
    },

    async down(queryInterface, Sequelize) {
        // Hard to undo specifically these, but we could delete entries added by this migration if we had an audit log
        // For now, we'll leave it or bulk delete product_units added by this (but we don't track them easily)
    }
};
