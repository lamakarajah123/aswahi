'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('user_addresses', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                type: Sequelize.STRING(255),
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE',
            },
            label: {
                type: Sequelize.STRING(100),
                allowNull: false,
                defaultValue: 'Home',
            },
            address: {
                type: Sequelize.STRING(500),
                allowNull: false,
            },
            latitude: {
                type: Sequelize.FLOAT,
                allowNull: false,
            },
            longitude: {
                type: Sequelize.FLOAT,
                allowNull: false,
            },
            is_default: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('user_addresses');
    },
};
