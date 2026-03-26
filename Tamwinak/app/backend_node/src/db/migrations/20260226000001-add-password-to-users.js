'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'password_hash', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },
    async down(queryInterface) {
        await queryInterface.removeColumn('users', 'password_hash');
    },
};
