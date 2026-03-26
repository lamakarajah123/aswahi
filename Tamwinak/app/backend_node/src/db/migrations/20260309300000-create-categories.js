'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create categories table
        await queryInterface.createTable('categories', {
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
            sort_order: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
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

        // 2. Add category_id FK column to products
        await queryInterface.addColumn('products', 'category_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'categories',
                key: 'id',
            },
            onDelete: 'SET NULL',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('products', 'category_id');
        await queryInterface.dropTable('categories');
    },
};
