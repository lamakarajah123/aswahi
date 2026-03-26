'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create industries table
        await queryInterface.createTable('industries', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            name_ar: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            icon: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // 2. Create store_industries junction table
        await queryInterface.createTable('store_industries', {
            store_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: { model: 'stores', key: 'id' },
                onDelete: 'CASCADE',
            },
            industry_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: { model: 'industries', key: 'id' },
                onDelete: 'CASCADE',
            },
        });

        // 3. Create store_products junction table
        await queryInterface.createTable('store_products', {
            store_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: { model: 'stores', key: 'id' },
                onDelete: 'CASCADE',
            },
            product_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: { model: 'products', key: 'id' },
                onDelete: 'CASCADE',
            },
            is_available: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            override_price: {
                type: Sequelize.FLOAT,
                allowNull: true,
            },
            added_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // 4. Add industry_id to products table
        await queryInterface.addColumn('products', 'industry_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'industries', key: 'id' },
            onDelete: 'SET NULL',
        });

        // 5. Seed default industries
        await queryInterface.bulkInsert('industries', [
            { name: 'Grocery', name_ar: 'بقالة', icon: '🛒', description: 'Supermarkets and grocery stores', is_active: true, created_at: new Date() },
            { name: 'Bakery', name_ar: 'مخبز', icon: '🍞', description: 'Bread, pastries and baked goods', is_active: true, created_at: new Date() },
            { name: 'Restaurant', name_ar: 'مطعم', icon: '🍽️', description: 'Cooked meals and food delivery', is_active: true, created_at: new Date() },
            { name: 'Pharmacy', name_ar: 'صيدلية', icon: '💊', description: 'Medicines and health products', is_active: true, created_at: new Date() },
            { name: 'Electronics', name_ar: 'إلكترونيات', icon: '📱', description: 'Electronic devices and accessories', is_active: true, created_at: new Date() },
            { name: 'Fashion', name_ar: 'أزياء', icon: '👗', description: 'Clothing and accessories', is_active: true, created_at: new Date() },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('products', 'industry_id');
        await queryInterface.dropTable('store_products');
        await queryInterface.dropTable('store_industries');
        await queryInterface.dropTable('industries');
    },
};
