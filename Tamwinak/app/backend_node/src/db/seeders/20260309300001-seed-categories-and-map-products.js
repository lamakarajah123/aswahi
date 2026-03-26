'use strict';

/**
 * Seeder: create-categories-and-map-products
 *
 * 1. Inserts the canonical category rows into the `categories` table.
 * 2. For every existing product whose `category` string matches one of those
 *    rows, sets `category_id` to the matching row's id.
 *
 * The `category` (string) column on products is left intact so the text-based
 * nearby-products query still works until you decide to migrate it to use the FK.
 */

const CATEGORIES = [
    { name: 'Fruits',     name_ar: 'فواكه',    icon: '🍎', description: 'Fresh fruits from local and international farms', sort_order: 1 },
    { name: 'Vegetables', name_ar: 'خضروات',   icon: '🥦', description: 'Fresh vegetables sourced daily',                  sort_order: 2 },
    { name: 'Dairy',      name_ar: 'ألبان',     icon: '🥛', description: 'Milk, cheese, yogurt, and dairy products',        sort_order: 3 },
    { name: 'Bakery',     name_ar: 'مخبوزات',  icon: '🍞', description: 'Freshly baked bread, pastries, and more',         sort_order: 4 },
    { name: 'Beverages',  name_ar: 'مشروبات',  icon: '🥤', description: 'Water, juices, soft drinks, and hot beverages',   sort_order: 5 },
    { name: 'Snacks',     name_ar: 'وجبات خفيفة', icon: '🍿', description: 'Chips, nuts, chocolate, and sweet treats',    sort_order: 6 },
    { name: 'Meat',       name_ar: 'لحوم',      icon: '🥩', description: 'Fresh and frozen halal meat products',           sort_order: 7 },
    { name: 'Seafood',    name_ar: 'مأكولات بحرية', icon: '🐟', description: 'Fresh and frozen fish and seafood',         sort_order: 8 },
    { name: 'Pantry',     name_ar: 'بقالة',     icon: '🛒', description: 'Cooking essentials, oils, spices, and staples',  sort_order: 9 },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Insert categories (ignore duplicates)
        await queryInterface.bulkInsert('categories', CATEGORIES.map(c => ({
            ...c,
            is_active: true,
            created_at: new Date(),
        })), { ignoreDuplicates: true });

        // 2. Fetch inserted category ids
        const [inserted] = await queryInterface.sequelize.query(
            `SELECT id, name FROM categories WHERE name IN (${CATEGORIES.map(() => '?').join(',')})`,
            { replacements: CATEGORIES.map(c => c.name), type: 'SELECT' }
        );
        const nameToId = {};
        (Array.isArray(inserted) ? inserted : [inserted]).forEach(row => {
            nameToId[row.name] = row.id;
        });

        // 3. Map products: for each category, set category_id where category string matches
        for (const [catName, catId] of Object.entries(nameToId)) {
            await queryInterface.sequelize.query(
                `UPDATE products SET category_id = :catId WHERE category = :catName AND category_id IS NULL`,
                { replacements: { catId, catName } }
            );
        }

        console.log(`Categories seeded and products mapped: ${Object.keys(nameToId).join(', ')}`);
    },

    async down(queryInterface) {
        // Remove category_id mappings and delete the seeded categories
        await queryInterface.sequelize.query(
            `UPDATE products SET category_id = NULL WHERE category IN (${CATEGORIES.map(c => `'${c.name}'`).join(',')})`
        );
        await queryInterface.bulkDelete('categories', {
            name: CATEGORIES.map(c => c.name),
        }, {});
    },
};
