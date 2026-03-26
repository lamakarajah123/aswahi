const { Sequelize } = require('sequelize');
const DATABASE_URL = 'postgres://postgres:1234@localhost:5432/tamwinak';
const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: false });

async function main() {
    try {
        await sequelize.authenticate();
        const columns = await sequelize.getQueryInterface().describeTable('orders');
        console.log(JSON.stringify(columns, null, 2));
    } catch (err) {
        console.error(err);
    } finally { await sequelize.close(); }
}
main();
