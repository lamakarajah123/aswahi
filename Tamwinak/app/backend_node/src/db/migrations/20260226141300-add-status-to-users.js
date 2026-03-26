// 20260226123456-add-status-to-users.js
'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.addColumn('users', 'status', {
                type: Sequelize.STRING(50),
                allowNull: false,
                defaultValue: 'active'
            });
        } catch (e) {
            console.warn('Column "status" already exists in "users" table, skipping.');
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'status');
    }
};
