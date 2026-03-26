const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('postgres://postgres:1234@localhost:5432/tamwinak', { logging: false });

async function fix() {
    try {
        await sequelize.query("UPDATE users SET status = 'active' WHERE role IN ('admin', 'super_admin');");
        console.log('Admin accounts activated successfully.');
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

fix();
