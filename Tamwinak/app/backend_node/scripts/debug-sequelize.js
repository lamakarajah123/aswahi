const { Client } = require('pg');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: console.log });

const Store = sequelize.define('Store', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    name: DataTypes.STRING,
    latitude: DataTypes.FLOAT,
    longitude: DataTypes.FLOAT,
    is_approved: DataTypes.BOOLEAN,
    is_active: DataTypes.BOOLEAN,
}, { tableName: 'stores', timestamps: false });

(async () => {
    await sequelize.authenticate();

    // Test 1: plain object where
    const r1 = await Store.findAll({ where: { is_approved: true, is_active: true } });
    console.log('\n--- Test1 (object where) ---', r1.length, r1.map(s => s.toJSON()));

    // Test 2: literal
    const r2 = await Store.findAll({ where: sequelize.literal('is_approved = true AND is_active = true') });
    console.log('\n--- Test2 (literal) ---', r2.length, r2.map(s => s.toJSON()));

    await sequelize.close();
})();
