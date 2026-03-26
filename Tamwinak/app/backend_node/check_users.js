const { Sequelize, DataTypes, Model } = require('sequelize');
const DATABASE_URL = 'postgres://postgres:1234@localhost:5432/tamwinak';
const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: false });

class User extends Model { }
User.init({
    id: { type: DataTypes.STRING, primaryKey: true },
    email: DataTypes.STRING,
}, { sequelize, tableName: 'users', timestamps: false });

async function main() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({ limit: 5 });
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error(err);
    } finally { await sequelize.close(); }
}
main();
