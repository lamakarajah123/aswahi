'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('delivery_areas', {
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
            boundaries: {
                type: Sequelize.JSONB,
                allowNull: false,
            },
            color: {
                type: Sequelize.STRING(20),
                allowNull: true,
                defaultValue: '#3B82F6',
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });

        await queryInterface.addIndex('delivery_areas', ['is_active']);
        await queryInterface.addIndex('delivery_areas', ['name']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('delivery_areas');
    },
};
