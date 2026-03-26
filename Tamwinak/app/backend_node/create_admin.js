const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL);

async function createAdmin() {
    try {
        await sequelize.authenticate();

        // Check columns
        const [cols] = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
        console.log('Columns:', cols.map(c => c.column_name));

        // Check if user exists
        const [existing] = await sequelize.query(`SELECT * FROM users WHERE email = 'admin@tamweenak.com'`);
        if (existing.length > 0) {
            // Update password
            await sequelize.query(
                `UPDATE users SET password_hash = '$2b$10$PU5d0BsgsBCJIp5Ypba6K.rkDqg/8Yb42X6KAhJ.9QeUHl6avYbKi', role = 'admin', status='active' WHERE email = 'admin@tamweenak.com'`
            );
            console.log('Admin password updated successfully!');
        } else {
            // Insert new
            await sequelize.query(
                `INSERT INTO users (id, email, name, password_hash, role, status, "createdAt", "updatedAt") 
         VALUES ('${require('crypto').randomUUID()}', 'admin@tamweenak.com', 'Admin User', '$2b$10$PU5d0BsgsBCJIp5Ypba6K.rkDqg/8Yb42X6KAhJ.9QeUHl6avYbKi', 'admin', 'active', NOW(), NOW())`
            );
            console.log('Admin user created successfully!');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

createAdmin();
