const { Sequelize, DataTypes, Model } = require('sequelize');
const DATABASE_URL = 'postgres://postgres:1234@localhost:5432/tamwinak';
const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: false });

class Order extends Model { }
Order.init({
    id: { type: DataTypes.INTEGER, primaryKey: true },
    user_id: DataTypes.STRING,
    store_id: DataTypes.INTEGER,
    status: DataTypes.STRING,
}, { sequelize, tableName: 'orders', timestamps: false });

class OrderItem extends Model { }
OrderItem.init({
    id: { type: DataTypes.INTEGER, primaryKey: true },
    order_id: DataTypes.INTEGER,
    product_id: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
}, { sequelize, tableName: 'order_items', timestamps: false });

class Product extends Model { }
Product.init({
    id: { type: DataTypes.INTEGER, primaryKey: true },
    stock_quantity: DataTypes.INTEGER,
    is_available: DataTypes.BOOLEAN,
}, { sequelize, tableName: 'products', timestamps: false });

async function main() {
    const t = await sequelize.transaction();
    try {
        const orderId = 9;
        const userId = '146364f3-5668-4bc8-8957-322f9495dd87';

        const order = await Order.findOne({ where: { id: orderId, user_id: userId }, transaction: t });
        if (!order) { console.log('Order not found'); await t.rollback(); return; }
        if (order.status !== 'pending') { console.log('Status not pending:', order.status); await t.rollback(); return; }

        console.log('Order found');
        const items = await OrderItem.findAll({ where: { order_id: orderId }, transaction: t });
        console.log('Items:', items.length);

        await order.update({ status: 'cancelled' }, { transaction: t });
        for (const item of items) {
            const p = await Product.findByPk(item.product_id, { transaction: t });
            if (p) { await p.update({ stock_quantity: (p.stock_quantity || 0) + item.quantity, is_available: true }, { transaction: t }); }
        }
        await t.commit();
        console.log('SUCCESS');
    } catch (err) {
        if (t) await t.rollback();
        console.error('FAIL:', err);
    } finally { await sequelize.close(); }
}
main();
