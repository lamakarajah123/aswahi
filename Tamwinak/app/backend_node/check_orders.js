const { Sequelize, DataTypes, Model } = require('sequelize');
const DATABASE_URL = 'postgres://postgres:1234@localhost:5432/tamwinak';
const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: false });

class Order extends Model { }
Order.init({
    id: { type: DataTypes.INTEGER, primaryKey: true },
    user_id: DataTypes.STRING,
    store_id: DataTypes.INTEGER,
    status: DataTypes.STRING,
    group_id: DataTypes.STRING,
}, { sequelize, tableName: 'orders', timestamps: false });

async function main() {
    try {
        await sequelize.authenticate();
        const orders = await Order.findAll({ limit: 10, order: [['id', 'DESC']] });
        console.log(JSON.stringify(orders, null, 2));
    } catch (err) {
        console.error(err);
    } finally { await sequelize.close(); }
}
main();
