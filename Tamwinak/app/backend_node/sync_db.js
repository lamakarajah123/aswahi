const { Sequelize, DataTypes, Model } = require('sequelize');
const DATABASE_URL = 'postgres://postgres:1234@localhost:5432/tamwinak';
const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: console.log });

class Order extends Model { }
Order.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.STRING, allowNull: false },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    driver_id: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false },
    subtotal: { type: DataTypes.FLOAT, allowNull: false },
    delivery_fee: { type: DataTypes.FLOAT, allowNull: false },
    total: { type: DataTypes.FLOAT, allowNull: false },
    delivery_address: { type: DataTypes.STRING, allowNull: true },
    delivery_lat: { type: DataTypes.FLOAT, allowNull: true },
    delivery_lng: { type: DataTypes.FLOAT, allowNull: true },
    notes: { type: DataTypes.STRING, allowNull: true },
    group_id: { type: DataTypes.STRING, allowNull: true },
    issue_details: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'orders', timestamps: false });

async function main() {
    try {
        await sequelize.authenticate();
        console.log('Syncing...');
        await sequelize.sync({ alter: true });
        console.log('Sync complete');
    } catch (err) {
        console.error(err);
    } finally { await sequelize.close(); }
}
main();
