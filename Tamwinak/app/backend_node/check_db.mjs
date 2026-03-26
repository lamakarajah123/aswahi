import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();
const s = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: false });
const [rows] = await s.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('industries','store_products','store_industries') ORDER BY table_name");
console.log('new tables:', rows.map(r => r.table_name).join(', ') || 'NONE');
await s.close();
