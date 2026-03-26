import { Sequelize } from 'sequelize';
import { env } from './env';

export const sequelize = new Sequelize(env.DATABASE_URL, {
    dialect: 'postgres',
    logging: env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 20,
        min: 2,
        acquire: 30_000,
        idle: 10_000,
    },
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL database connection established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        process.exit(1);
    }
};
